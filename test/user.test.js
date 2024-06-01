const request = require('supertest');
const app = require('../app')

describe("POST /api/user/registration", () => {
    it("should register new user", async () => {
        const data = { firstname: "John", lastname: "Doe", email: "john5@doe.com", password: "123456" };
        const response = await request(app).post("/api/user/registration").send(data);
        expect(response.statusCode).toBe(200);
    });
});