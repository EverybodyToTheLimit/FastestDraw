const moment = require("moment");

const nthNumber = (number) => {
  if (number > 3 && number < 21) return "th";
  switch (number % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const offsetBookingDate = (offset) => {
    const currentDate = moment();
    const futureDate = currentDate.add(offset, 'days');
    const dayOfWeek = futureDate.format('ddd'); // Day of the week (e.g., Mon, Tue)
    const dayOfMonth = futureDate.format('DD'); // Day of the month (e.g., 05)
    const formattedDate = `${dayOfWeek}, ${dayOfMonth + nthNumber(dayOfMonth)}`;
    return formattedDate;
  }

module.exports = offsetBookingDate