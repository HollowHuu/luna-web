import { prisma } from "@/app/dbConnection";
import { headers } from "next/headers";
import { validateKey } from "@/components/API/verify";
import { ValoarntMMR } from "@/components/types";

export async function GET() {
    // Check headers for api token
    const h = headers()

    const token = h.get('Authorization')
    if(!token) return Response.json({error: 'No token provided'}, {status: 401})

    // Check if token is valid
    const valid = await validateKey(token)
    if(!valid) return Response.json({error: 'Invalid token provided'}, {status: 401})

    const discordId = h.get('Discord-ID')
    if(!discordId) return Response.json({error: 'No Dis cord ID provided'}, {status: 400})

    const user = await prisma.user.findFirst({
        where: {
            accounts: {
                some: {
                    providerAccountId: discordId
                }
            }
        },
    })

    console.log({user})

    const puuid = user?.riot
    if(!puuid) return Response.json({error: 'No Riot ID found'}, {status: 404})

    const profileData = await fetch(`https://api.henrikdev.xyz/valorant/v1/by-puuid/account/${puuid}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            "authorization": `${process.env.HDEV_API_KEY}`
        }
    })
    .then(res => res.json())
    .then(json => json.data)

    if(!profileData) return Response.json({error: 'No profile found'}, {status: 404})

    const mmr = await fetch(`https://api.henrikdev.xyz/valorant/v2/by-puuid/mmr/eu/${puuid}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            "authorization": `${process.env.HDEV_API_KEY}`
        }
    }).then(res => res.json())
    .then(json => json.data)

    if(!mmr) return Response.json({error: 'No mmr found'}, {status: 404})

    console.log({mmr, profileData})

    const responseData: ValoarntMMR = {
        name: profileData.name as string,
        tag: profileData.tag as string,
        elo: mmr.current_data.elo as number,
        currenttier: mmr.current_data.currenttier as number,
        currenttierpatched: mmr.current_data.currenttierpatched as string, 
        banner: {
            small: profileData.card.small as string,
            large: profileData.card.large as string,
            wide: profileData.card.wide as string
        },
        currentrankimage: mmr.current_data.images.large as string,
        account_level: profileData.account_level as string
    }

    return Response.json(responseData)

}
