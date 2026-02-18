function startOfToday(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function createExpiringSoonFilter(days = 3, referenceDate = new Date()) {
  const today = startOfToday(referenceDate);
  const upperBound = addDays(today, days);

  return {
    gte: today,
    lte: upperBound
  };
}

module.exports = {
  startOfToday,
  addDays,
  createExpiringSoonFilter
};
