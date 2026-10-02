import {  Options, RRule, Weekday } from 'rrule';
import { DayKey, RecurrencePayload } from '../types/types';

const weekdayMap: Record<DayKey, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

export const generateRRuleString = (options: RecurrencePayload) => {
  const freqEnum = RRule[options.frequency];

  const rruleOptions: Partial<Options> = {
    freq: freqEnum,
    interval: options.interval || 1,
  };

  if (options.daysOfWeek && options.daysOfWeek.length > 0) {
    rruleOptions.byweekday = options.daysOfWeek.map((d) => weekdayMap[d]);
  }

  if (options.byMonthDay) {
    rruleOptions.bymonthday = options.byMonthDay;
  }

  if (options.bySetPos) {
    rruleOptions.bysetpos = options.bySetPos;
  }

  if (options.until) {
    rruleOptions.until = new Date(options.until);
  }

  if (options.count) {
    rruleOptions.count = options.count;
  }

  if (options.dtstart) {
    rruleOptions.dtstart = new Date(options.dtstart);
  } else {
    rruleOptions.dtstart = new Date(Date.now());
  }

  const rule = new RRule(rruleOptions);

  return rule.toString();
};
