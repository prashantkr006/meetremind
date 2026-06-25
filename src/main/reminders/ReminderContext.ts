import type { UserContext } from '../../shared/types'
import type { ContextProvider } from './types'

// Placeholder — always returns UNKNOWN until OS-specific detection is added.
// Future providers (IdleTimeProvider, ActiveWindowProvider) implement this interface.
class FallbackContextProvider implements ContextProvider {
  readonly name = 'FallbackContextProvider'

  async detect(): Promise<UserContext> {
    return 'UNKNOWN'
  }
}

// Tries each provider in order, returns the first non-UNKNOWN result.
// If all fail or return UNKNOWN, returns UNKNOWN.
export class CompositeContextProvider implements ContextProvider {
  readonly name = 'CompositeContextProvider'
  private providers: ContextProvider[]

  constructor(providers: ContextProvider[] = []) {
    // Always append fallback so detect() never throws
    this.providers = [...providers, new FallbackContextProvider()]
  }

  async detect(): Promise<UserContext> {
    for (const provider of this.providers) {
      try {
        const ctx = await provider.detect()
        if (ctx !== 'UNKNOWN') return ctx
      } catch {
        // Provider failed — try next
      }
    }
    return 'UNKNOWN'
  }
}

// Singleton used by the engine — swap in real providers here as OS detection is built
export const contextProvider = new CompositeContextProvider([
  // Future: new IdleTimeProvider(),
  // Future: new ActiveWindowProvider(),
])
