import { BrowserWindow, shell } from 'electron'
import { OAuth2Client } from 'google-auth-library'
import { StoreManager } from './store'
import crypto from 'crypto'

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

const KEYTAR_SERVICE = 'MeetRemind'

let keytar: typeof import('keytar') | null = null
try {
  keytar = require('keytar')
} catch {
  console.warn('keytar not available, tokens stored in plain store')
}

async function saveToken(account: string, token: string) {
  if (keytar) await keytar.setPassword(KEYTAR_SERVICE, account, token)
}

async function getToken(account: string): Promise<string | null> {
  if (keytar) return keytar.getPassword(KEYTAR_SERVICE, account)
  return null
}

async function deleteToken(account: string) {
  if (keytar) await keytar.deletePassword(KEYTAR_SERVICE, account)
}

export interface AuthStatus {
  google: boolean
  microsoft: boolean
}

export class AuthManager {
  private store: StoreManager
  private googleClient: OAuth2Client | null = null
  private microsoftToken: string | null = null

  // In dev: loaded from .env file
  // In production builds: set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / MICROSOFT_CLIENT_ID
  // as environment variables in your CI (GitHub Actions secrets) before running electron-builder,
  // OR hardcode them here once you have real OAuth credentials.
  private readonly GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
  private readonly GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
  private readonly MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID ?? ''

  constructor(store: StoreManager) {
    this.store = store
  }

  async init() {
    await this.tryRestoreGoogle()
    await this.tryRestoreMicrosoft()
  }

  private async tryRestoreGoogle() {
    const token = await getToken('google')
    if (!token) return
    try {
      const creds = JSON.parse(token)
      this.googleClient = new OAuth2Client(
        this.GOOGLE_CLIENT_ID,
        this.GOOGLE_CLIENT_SECRET,
        'urn:ietf:wg:oauth:2.0:oob'
      )
      this.googleClient.setCredentials(creds)
    } catch {
      this.googleClient = null
    }
  }

  private async tryRestoreMicrosoft() {
    const token = await getToken('microsoft')
    if (token) this.microsoftToken = token
  }

  getGoogleClient(): OAuth2Client | null {
    return this.googleClient
  }

  getMicrosoftToken(): string | null {
    return this.microsoftToken
  }

  getStatus(): AuthStatus {
    return {
      google: this.googleClient !== null,
      microsoft: this.microsoftToken !== null,
    }
  }

  async connectGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!this.GOOGLE_CLIENT_ID) {
      return { success: false, error: 'GOOGLE_CLIENT_ID not configured. See README.' }
    }
    try {
      const client = new OAuth2Client(
        this.GOOGLE_CLIENT_ID,
        this.GOOGLE_CLIENT_SECRET,
        'http://localhost:42813'
      )

      const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        prompt: 'consent',
      })

      // Start server first, open browser second, then await callback
      const codePromise = this.startLocalOAuthServer(42813)
      shell.openExternal(authUrl)
      const authCode = await codePromise

      const { tokens } = await client.getToken(authCode)
      client.setCredentials(tokens)
      this.googleClient = client

      await saveToken('google', JSON.stringify(tokens))
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  async connectMicrosoft(useWorkAccount = false): Promise<{ success: boolean; error?: string }> {
    if (!this.MICROSOFT_CLIENT_ID) {
      return { success: false, error: 'MICROSOFT_CLIENT_ID not configured. See README.' }
    }
    try {
      const redirectUri = 'http://localhost:42814'

      // 'consumers' = personal accounts (Outlook.com, Hotmail, Live.com)
      // 'organizations' = work/school accounts (requires admin consent if tenant blocks it)
      // 'common' = both (but blocked tenants will fail with AADSTS5000225)
      const tenant = useWorkAccount ? 'organizations' : 'consumers'

      const codeVerifier = generateCodeVerifier()
      const codeChallenge = generateCodeChallenge(codeVerifier)

      const authUrl =
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize` +
        `?client_id=${this.MICROSOFT_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('Calendars.Read offline_access')}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256` +
        `&prompt=consent`

      const codePromise = this.startLocalOAuthServer(42814)
      shell.openExternal(authUrl)
      const code = await codePromise

      const resp = await fetch(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: this.MICROSOFT_CLIENT_ID,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier,
          }),
        }
      )
      const data = (await resp.json()) as { access_token?: string; error?: string; error_description?: string }

      if (!data.access_token) {
        const desc = data.error_description ?? data.error ?? 'No access token received'
        // Detect tenant-blocked error and give actionable message
        if (desc.includes('AADSTS5000225') || desc.includes('blocked')) {
          throw new Error(
            'Your organization has blocked this app.\n\n' +
            'Options:\n' +
            '1. Use a personal Microsoft account (Outlook.com/Hotmail) instead\n' +
            '2. Ask your IT admin to approve "MeetRemind" in Azure AD App Consent\n' +
            '3. Ask admin to run: az ad app permission admin-consent --id ' + this.MICROSOFT_CLIENT_ID
          )
        }
        throw new Error(desc)
      }

      this.microsoftToken = data.access_token
      await saveToken('microsoft', data.access_token)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  async disconnectGoogle() {
    this.googleClient = null
    await deleteToken('google')
  }

  async disconnectMicrosoft() {
    this.microsoftToken = null
    await deleteToken('microsoft')
  }

  private startLocalOAuthServer(port: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const http = require('http') as typeof import('http')
      const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', `http://localhost:${port}`)
        const code = url.searchParams.get('code')
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<h2>Auth complete — you can close this tab.</h2>')
        server.close()
        if (code) resolve(code)
        else reject(new Error('No code in redirect'))
      })
      server.listen(port)
      setTimeout(() => {
        server.close()
        reject(new Error('OAuth timeout'))
      }, 120_000)
    })
  }
}
