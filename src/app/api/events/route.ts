import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    console.log('Fetching events for student dashboard...')
    
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        eventDate: {
          gte: new Date() // Only future events
        }
      },
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

    console.log(`Found ${events.length} active events for students`)
    
    // Add available slots calculation
    const eventsWithAvailability = events.map(event => ({
      ...event,
      availableSlots: event.quota - event._count.tickets,
      isFull: event._count.tickets >= event.quota
    }))

    return NextResponse.json(eventsWithAvailability)
    
  } catch (error) {
    console.error("Error fetching events:", error)
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    )
  }
}