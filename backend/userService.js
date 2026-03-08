import { getUsers } from "../userService.js"

export async function listUsers(req, res) {
    try {
        const users = await getUsers()
        req.json(users)
    } catch (error) {
        res.status(500).json({
        error: "Erro ao buscar usuários"
            })
    }
}