import type { ReminderRule, ReminderEvent } from './types'

// Only fire if the stage is enabled in the profile
class StageEnabledRule implements ReminderRule {
  readonly name = 'StageEnabledRule'

  evaluate(event: ReminderEvent): boolean {
    const stage = event.profile.stages.find(
      (s) => s.minutesBefore === event.minutesBefore,
    )
    return stage?.enabled ?? true
  }
}

// Skip meetings that have already ended
class MeetingNotEndedRule implements ReminderRule {
  readonly name = 'MeetingNotEndedRule'

  evaluate(event: ReminderEvent): boolean {
    return new Date(event.meeting.endTime).getTime() > Date.now()
  }
}

// Evaluates all rules; a single false suppresses the reminder
export class RuleEvaluator {
  private rules: ReminderRule[]

  constructor(rules: ReminderRule[] = []) {
    this.rules = [
      new StageEnabledRule(),
      new MeetingNotEndedRule(),
      ...rules,
      // Future: new DoNotDisturbRule(), new FocusModeRule()
    ]
  }

  passes(event: ReminderEvent): boolean {
    return this.rules.every((rule) => rule.evaluate(event))
  }
}
