const {getUsersContainer} = require("../azure/db");
module.exports = class User {
    constructor(email, password, firstname, lastname, role='user') {
        this.email = email;
        this.hashPassword = password;
        this.firstname = firstname;
        this.lastname = lastname;
        this.role = role;
        this.locked = false
    }
    async create() {
        const container = await getUsersContainer()
        await container.items.create(this);
    }
    async find(querySpec) {
        const container = await getUsersContainer()
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources[0]
    }
    async get(id) {
        const container = await getUsersContainer()
        const { resource:user } = await container.item(id).read();
        return user
    }
    async findAll(querySpec) {
        const container = await getUsersContainer()
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources
    }
    async update(id, user) {
        const container = await getUsersContainer()
        const { resource: updatedUser } = await container.item(id).replace(user);
        return updatedUser
    }
    async delete(id) {
        const userContainer = await getUsersContainer()
        await userContainer.item(id).delete()
    }
}