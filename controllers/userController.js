const {getContainer} = require("../azure");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {v4: uuidv4} = require("uuid");

const generateAccessToken = (id, email) => {
    const payload = {
        id,
        email
    }
    return jwt.sign(payload, process.env.SECRET_KEY, {expiresIn: "30d"} )
}

class UserController {
    async registration(req, res) {
        try {
            const container = await getContainer('Users');
            const {email, password, firstname, lastname} = req.body;
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
                return res.status(400).json({status: 'error', message: "User already exists" });
            }
            const hashedPassword = await bcrypt.hash(password, 5)
            const newBody = {email, hashPassword:hashedPassword, firstname, lastname}
            const { resource } = await container.items.create(newBody);
            const {hashPassword, ...userData} = resource
            return res.status(200).json({status: 'success', user: userData});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }

    }
    async login(req, res) {
        try {
            const container = await getContainer('Users');
            const {email, password} = req.body;
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
                return res.status(400).json({ message: "Incorrect email or password!" });
            }
            const token = generateAccessToken(user.id, user.email)
            return res.status(200).json({ token: token });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getMyInfo(req, res) {
        try {
            const userId = req.user.id;
            const container = await getContainer('Users');
            const { resource:user } = await container.item(userId).read();
            const {hashPassword, ...userData} = user
            const querySpec = {
                query: 'SELECT SUM(c.size) FROM c WHERE c.userId = @userId',
                parameters: [
                    {
                        name: '@userId',
                        value: userId
                    }
                ]
            };
            const imageContainer = await getContainer('Images');
            const { resources } = await imageContainer.items.query(querySpec).fetchAll();
            return res.status(200).json({ status:'success', user: userData, memory:resources[0] });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async updateMyInfo(req,res) {
        try {
            const userId = req.user.id;
            const container = await getContainer('Users');
            const { resource: user } = await container.item(userId).read();
            const body = req.body
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
                    return res.status(400).json({status: 'error', message: "User already exists" });
                }
            }
            Object.keys(body).forEach(key => {
                user[key] = body[key];
            });
            const { resource: updatedUser } = await container.item(userId).replace(user);
            return res.status(200).json({ status:'success', user: updatedUser });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
}

module.exports = new UserController()