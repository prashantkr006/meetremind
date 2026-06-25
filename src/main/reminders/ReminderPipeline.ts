import type { ReminderEvent, PipelineStage } from './types'
import type { ContextProvider } from './types'
import { RuleEvaluator } from './ReminderRule'

// Stage 1: Enrich event with current user context
class ContextStage implements PipelineStage {
  readonly name = 'ContextStage'
  constructor(private provider: ContextProvider) {}

  async process(event: ReminderEvent): Promise<ReminderEvent | null> {
    const context = await this.provider.detect()
    return { ...event, context }
  }
}

// Stage 2: Evaluate rules — null return suppresses the reminder
class RuleStage implements PipelineStage {
  readonly name = 'RuleStage'
  constructor(private evaluator: RuleEvaluator) {}

  async process(event: ReminderEvent): Promise<ReminderEvent | null> {
    return this.evaluator.passes(event) ? event : null
  }
}

// Stage 3: Analytics sink — no-op now, ready for Mixpanel/Plausible/custom
class AnalyticsStage implements PipelineStage {
  readonly name = 'AnalyticsStage'

  async process(event: ReminderEvent): Promise<ReminderEvent | null> {
    // Future: analyticsClient.track('reminder_fired', { urgency, stage, meetingId })
    return event
  }
}

// Runs an event through all stages in order.
// Any stage returning null short-circuits the pipeline (reminder suppressed).
export class ReminderPipeline {
  private stages: PipelineStage[]

  constructor(contextProvider: ContextProvider) {
    this.stages = [
      new ContextStage(contextProvider),
      new RuleStage(new RuleEvaluator()),
      new AnalyticsStage(),
      // Future: new WeatherStage(), new AISummaryStage(), new ThemeStage()
    ]
  }

  async run(event: ReminderEvent): Promise<ReminderEvent | null> {
    let current: ReminderEvent | null = event
    for (const stage of this.stages) {
      if (!current) return null
      current = await stage.process(current)
    }
    return current
  }
}
