export async function POST(req) {
    try {
        const body = await req.json()
        const { alias, identityKey, protocolID, keyID, signature } = body

        // check that the signature is valid for the identityKey

        // check if alias is available

        // if yes then create a record mapping the alias to the identityKey and return success

        // if no return error

        return Response.json(response, { status: 200 })
    } catch (error) {
        console.log({ error })
        return Response.json({ error: error.message }, { status: 400 })
    }
}