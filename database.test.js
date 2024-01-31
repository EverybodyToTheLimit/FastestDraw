const db = require('./database');

beforeAll(async () => {
    await db.sequelize.sync({ force: true });
});

test('create booking', async () => {
    expect.assertions(1);
    const booking = await db.Booking.create({
        id: 1,
        className: 'Power Pump',
        startTime: '09:30',
        bookingUid: '123123'
    });
    expect(booking.id).toEqual(1);
});

test('get booking', async () => {
    expect.assertions(3);
    const booking = await db.Booking.findByPk(1);
    expect(booking.className).toEqual('Power Pump');
    expect(booking.startTime).toEqual('09:30');
    expect(booking.bookingUid).toEqual('123123')
});

test('delete booking', async () => {
    expect.assertions(1);
    await db.Booking.destroy({
        where: {
            id: 1
        }
    });
    const booking = await db.Booking.findByPk(1);
    expect(booking).toBeNull();
});

afterAll(async () => {
    await db.sequelize.close();
});