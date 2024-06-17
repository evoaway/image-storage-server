const request = require('supertest');
const app = require('../app')

const adminToken = process.env.ADMIN_TOKEN;
let token, id;

describe("POST /api/user/registration", () => {
    test("should register new user", async () => {
        const data = { firstname: "John", lastname: "Doe", email: "john@doe.com", password: "123456" };
        const response = await request(app).post("/api/user/registration").send(data);
        id = response.body.user.id;
        expect(response.statusCode).toBe(200);
    });
    test("should verify email", async () => {
        const data = { firstname: "John", lastname: "Doe", email: "john.com", password: "123456" };
        const response = await request(app).post("/api/user/registration").send(data);
        expect(response.statusCode).toBe(400);
    });
    test("should verify password", async () => {
        const data = { firstname: "John", lastname: "Doe", email: "john2@doe.com", password: "" };
        const response = await request(app).post("/api/user/registration").send(data);
        expect(response.statusCode).toBe(400);
    });
});
describe("GET /api/user/login", () => {
    test("should return new token", async () => {
        const data = { email: "john@doe.com", password: "123456" };
        const response = await request(app).post("/api/user/login").send(data);
        token = response.body.token;
        expect(response.statusCode).toBe(200);
    });
})
describe("GET /api/user", () => {
    test("should return user data", async () => {
        const response = await request(app).get("/api/user")
            .set('Authorization',  `Bearer ${token}`)
        expect(response.statusCode).toBe(200);
    });
    test("checking authorization middleware", async () => {
        const response = await request(app).get("/api/user")
        expect(response.statusCode).toBe(401);
    });
})
describe("GET /api/user/admin/info", () => {
    test("should return full data", async () => {
        const response = await request(app).get("/api/user/admin/info")
            .set('Authorization',  `Bearer ${adminToken}`)
        expect(response.statusCode).toBe(200);
    });
    test("checking role middleware", async () => {
        const response = await request(app).get("/api/user/admin/info")
            .set('Authorization',  `Bearer ${token}`)
        expect(response.statusCode).toBe(403);
    });
})
describe("POST /api/user/admin/:id", () => {
    test("should delete user", async () => {
        const response = await request(app).delete(`/api/user/admin/${id}`)
            .set('Authorization',  `Bearer ${adminToken}`)
        expect(response.statusCode).toBe(200);
    });
})