const request = require('supertest');
const app = require('../app')
const path = require('path');
const fs = require('fs');

const token = process.env.ADMIN_TOKEN;
let imageId,albumId

describe("POST /api/image", () => {
    test("should upload image", async () => {
        const response = await request(app).post("/api/image")
            .set('Authorization',  `Bearer ${token}`)
            .attach("images", path.resolve(__dirname,'image.JPEG'));
        expect(response.statusCode).toBe(200);
    });
});
describe("GET /api/album", () => {
    test("should return users albums", async () => {
        const response = await request(app).get("/api/album")
            .set('Authorization',  `Bearer ${token}`)
        albumId = response.body.albums[0].id;
        expect(response.statusCode).toBe(200);
    });
});
describe("GET /api/album/:id", () => {
    test("should return users images in album", async () => {
        const response = await request(app).get(`/api/album/${albumId}`)
            .set('Authorization',  `Bearer ${token}`)
        imageId = response.body.images[0].id;
        expect(response.statusCode).toBe(200);
    });
});
describe("PUT /api/album/:id", () => {
    test("should add new user to sharedWith array", async () => {
        const data = { email:"test@test.gmail.com" };
        const response = await request(app).get(`/api/album/shared/${albumId}`)
            .set('Authorization',  `Bearer ${token}`)
            .send(data)
        expect(response.statusCode).toBe(200);
    });
});
describe("GET /api/image/:id", () => {
    test("should return image data", async () => {
        const response = await request(app).get(`/api/image/${imageId}`)
            .set('Authorization',  `Bearer ${token}`)
        expect(response.statusCode).toBe(200);
    });
});
describe("DELETE /api/album/:id", () => {
    test("should delete album", async () => {
        const response = await request(app).delete(`/api/album/${albumId}`)
            .set('Authorization',  `Bearer ${token}`)
        expect(response.statusCode).toBe(200);
    });
});
