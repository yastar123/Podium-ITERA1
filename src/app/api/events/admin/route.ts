import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const events = await prisma.event.findMany({
      include: {
        _count: {
          select: {
            tickets: true
          }
        }
      },
      orderBy: {
        eventDate: "asc"
      }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error("Error fetching admin events:", error)
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    )
  }
}