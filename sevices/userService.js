const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require('../models/userModel')
const {getUsersContainer, getImagesContainer} = require("../azure/helpers");
const AlbumService = require('../sevices/albumService')

const generateAccessToken = (id, email, role) => {
    const payload = {
        id,
        email,
        role
    }
    return jwt.sign(payload, process.env.SECRET_KEY, {expiresIn: "30d"} )
}

class UserService {
    async create(email, password, firstname, lastname) {
        const container = await getUsersContainer()
        const querySpec = {
            query: 'SELECT c.id FROM c WHERE c.email = @email',
            parameters: [
                {
                    name: '@email',
                    value: email
                }
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        if (resources.length > 0) {
            throw new Error("User already exists");
        }
        const hashedPassword = await bcrypt.hash(password, 5)
        const user = new User(email, hashedPassword, firstname, lastname)
        const { resource } = await container.items.create(user);
        const {hashPassword, ...userData} = resource
        return userData;
    }
    async login(email, password) {
        const container = await getUsersContainer()
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [
                {
                    name: '@email',
                    value: email
                }
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        const user = resources[0]
        if (!user || !bcrypt.compareSync(password, user.hashPassword)) {
            throw new Error("Incorrect email or password!");
        }
        if (user.locked) {
            throw new Error("User is blocked");
        }
        return generateAccessToken(user.id, user.email, user.role);
    }
    async getMe(id) {
        const container = await getUsersContainer()
        const { resource:user } = await container.item(id).read();
        const {hashPassword, ...userData} = user
        const querySpec = {
            query: 'SELECT SUM(c.size) FROM c WHERE c.userId = @userId',
            parameters: [
                {
                    name: '@userId',
                    value: id
                }
            ]
        };
        const imageContainer = await getImagesContainer();
        const { resources } = await imageContainer.items.query(querySpec).fetchAll();
        return { user: userData, memory:resources[0] };
    }
    async update(id, body) {
        const container = await getUsersContainer()
        const { resource: user } = await container.item(id).read();
        if(body.email){
            const querySpec = {
                query: 'SELECT c.id FROM c WHERE c.email = @email',
                parameters: [
                    {
                        name: '@email',
                        value: body.email
                    }
                ]
            };
            const { resources } = await container.items.query(querySpec).fetchAll();
            if (resources.length > 0) {
                throw new Error("User already exists");
            }
        }
        Object.keys(body).forEach(key => {
            user[key] = body[key];
        });
        const { resource: updatedUser } = await container.item(id).replace(user);
        return updatedUser;
    }
    async getUserByEmail(email){
        const container = await getUsersContainer()
        const querySpec = {
            query: 'SELECT c.id FROM c WHERE c.email = @email',
            parameters: [
                {
                    name: '@email',
                    value: email
                }
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return  resources[0]
    }
    async getFullInfo() {
        const imageContainer = await getImagesContainer()
        const { resources: imagesData } = await imageContainer.items.query('SELECT c. userId, COUNT(1) as count, SUM(c.size) as sum FROM c GROUP BY c.userId').fetchAll();
        const userContainer = await getUsersContainer()
        const { resources: users } = await userContainer.items.query('SELECT * FROM c').fetchAll()
        return users.map(user => {
            const images = imagesData.find(images => images.userId === user.id);
            return {
                id: user.id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                sum: images ? images.sum : 0,
                count: images ? images.count : 0,
            };
        })
    }
    async block(id) {
        const userContainer = await getUsersContainer()
        const {resource:user} = await userContainer.item(id).read()
        user.locked = !user.locked
        const { resource: updatedUser } = await userContainer.item(id).replace(user);
        return updatedUser
    }
    async deleteUser(id) {
        const userContainer = await getUsersContainer()
        await userContainer.item(id).delete()
    }
}

module.exports = new UserService()