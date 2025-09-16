import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        eventDate: {
          gte: new Date() // Only future events
        }
      },
      orderBy: {
        eventDate: "asc"
      }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error("Error fetching events:", error)
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    )
  }
}