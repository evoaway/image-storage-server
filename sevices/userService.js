const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require('../models/userModel')
const Image = require('../models/imageModel')

const generateAccessToken = (id, email, role) => {
    const payload = {
        id,
        email,
        role
    }
    return jwt.sign(payload, process.env.SECRET_KEY, {expiresIn: "30d"} )
}

const formatBytes = (bytes,decimals) => {
    if(bytes === 0) return '0 Bytes';
    const k = 1024,
        dm = decimals || 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

class UserService {
    async create(email, password, firstname, lastname) {
        const hashedPassword = await bcrypt.hash(password, 5)
        const user = new User(email, hashedPassword, firstname, lastname)
        const querySpec = {
            query: 'SELECT c.id FROM c WHERE c.email = @email',
            parameters: [
                {
                    name: '@email',
                    value: email
                }
            ]
        };
        const existUser = await user.find(querySpec)
        if (existUser) {
            throw new Error("User already exists");
        }
        await user.create()
        const {hashPassword, ...userData} = user
        return userData;
    }
    async login(email, password) {
        const user = new User()
        user.email = email
        user.hashPassword = password
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [
                {
                    name: '@email',
                    value: email
                }
            ]
        };
        const findUser = await user.find(querySpec)
        if (!findUser || !bcrypt.compareSync(password, findUser.hashPassword)) {
            throw new Error("Incorrect email or password!");
        }
        if (findUser.locked) {
            throw new Error("User is blocked");
        }
        return generateAccessToken(findUser.id, findUser.email, findUser.role);
    }
    async getMe(id) {
        const user = new User()
        const result = await user.get(id)
        const {hashPassword, ...userData} = result
        const querySpec = {
            query: 'SELECT SUM(c.size) as sum FROM c WHERE c.userId = @userId',
            parameters: [
                {
                    name: '@userId',
                    value: id
                }
            ]
        };
        const images = new Image()
        const resources = await images.find(querySpec)
        return { user: userData, memory: formatBytes(resources[0].sum) };
    }
    async update(id, body) {
        const user = new User()
        const updateUser = await user.get(id)
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
            const existUser = await user.find(querySpec)
            if (existUser) {
                throw new Error("User already exists");
            }
        }
        Object.keys(body).forEach(key => {
            updateUser[key] = body[key];
        });
        return await user.update(id, updateUser);
    }
    async getUserByEmail(email){
        const querySpec = {
            query: 'SELECT c.id FROM c WHERE c.email = @email',
            parameters: [
                {
                    name: '@email',
                    value: email
                }
            ]
        };
        const user = new User()
        return await user.find(querySpec)
    }
    async getFullInfo() {
        const querySpec = {
            query: 'SELECT c. userId, COUNT(1) as count, SUM(c.size) as sum FROM c GROUP BY c.userId'
        }
        const image = new Image()
        const imagesData = await image.find(querySpec)
        const query = {
            query: 'SELECT c.id, c.firstname, c.lastname, c.email FROM c WHERE c.role = @role',
            parameters: [
                {
                    name: '@role',
                    value: 'user'
                }
            ]
        };
        const user = new User()
        const users = await user.findAll(query)
        return users.map(user => {
            const images = imagesData.find(images => images.userId === user.id);
            return {
                id: user.id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                sum: images ? formatBytes(images.sum) : 0,
                count: images ? images.count : 0,
            };
        })
    }
    async block(id) {
        const userModel = new User()
        const user = await userModel.get(id)
        user.locked = !user.locked
        return await userModel.update(id, user)
    }
    async deleteUser(id) {
        const userModel = new User()
        await userModel.delete(id)
    }
}

module.exports = new UserService()