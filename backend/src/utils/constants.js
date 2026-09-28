/**
 * Platform-wide business rules that are not (yet) admin-configurable.
 *
 * MAX_FREE_TRIALS_PER_DAY: the most free-trial classes ONE parent may have
 * booked on a single calendar day (the class date, in the parent's own
 * timezone). This is separate from AdminConfig.maxFreeTrialsPerFamily,
 * which caps the lifetime total. Cancelled trials don't count toward the
 * daily cap (the parent freed that day up), but they still count toward the
 * lifetime total, so cancel-and-rebook can't be used to get extra trials.
 */
const MAX_FREE_TRIALS_PER_DAY = 2;

module.exports = { MAX_FREE_TRIALS_PER_DAY };