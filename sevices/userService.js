const {getContainer} = require("../azure/azureConnections");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require('../models/userModel')
const {getUsersContainer} = require("../azure/helpers");

const generateAccessToken = (id, email) => {
    const payload = {
        id,
        email
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
        return generateAccessToken(user.id, user.email);
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
        const imageContainer = await getContainer('Images');
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
}

module.exports = new UserService()