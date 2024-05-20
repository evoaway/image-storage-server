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
            const hashPassword = await bcrypt.hash(password, 5)
            const newBody = {email, hashPassword, firstname, lastname}
            const { resource } = await container.items.create(newBody);
            return res.status(200).json({status: 'success', user: resource});
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
}

module.exports = new UserController()