import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { nanoid } from "nanoid"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Unauthorized - Only students can claim tickets" },
        { status: 401 }
      )
    }

    const { eventId } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      )
    }

    // Check if event exists and is active
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    if (!event.isActive) {
      return NextResponse.json(
        { error: "Event is not active" },
        { status: 400 }
      )
    }

    // Use transaction to prevent race conditions
    const ticket = await prisma.$transaction(async (tx) => {
      // Check if user already has a ticket for this event
      const existingTicket = await tx.ticket.findFirst({
        where: {
          userId: session.user.id,
          eventId: eventId
        }
      })

      if (existingTicket) {
        throw new Error("You already have a ticket for this event")
      }

      // Find any available ticket batch (tanpa filter eventId)
      const availableBatch = await tx.ticket_batches.findFirst({
        where: {
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
          available: { gt: 0 }
        },
        orderBy: { startDate: 'asc' }
      })

      if (!availableBatch) {
        throw new Error("No available ticket batches at this time")
      }

      // Check event quota
      const currentEvent = await tx.event.findUnique({
        where: { id: eventId },
        include: {
          _count: {
            select: { tickets: true }
          }
        }
      })

      if (!currentEvent) {
        throw new Error("Event not found")
      }

      if (currentEvent._count.tickets >= currentEvent.quota) {
        throw new Error("Sorry, this event is full")
      }

      // Generate unique ticket code
      const ticketCode = nanoid(10).toUpperCase()

      // Create the ticket
      const newTicket = await tx.ticket.create({
        data: {
          ticketCode,
          userId: session.user.id,
          eventId: eventId,
          batchId: availableBatch.id,
          status: "ACTIVE",
        },
        include: {
          event: true,
          user: {
            select: {
              name: true,
              email: true,
              nim: true
            }
          },
          ticket_batches: true
        }
      })

      // Update available count
      await tx.ticket_batches.update({
        where: { id: availableBatch.id },
        data: { available: { decrement: 1 } }
      })

      return newTicket
    })

    return NextResponse.json({
      message: "Ticket claimed successfully!",
      ticket
    })
  } catch (error: any) {
    console.error("Error claiming ticket:", error)
    
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "You already have a ticket for this event" },
        { status: 400 }
      )
    }
    
    if (error.message?.includes("already have a ticket")) {
      return NextResponse.json(
        { error: "You already have a ticket for this event" },
        { status: 400 }
      )
    }
    
    if (error.message?.includes("event is full")) {
      return NextResponse.json(
        { error: "Sorry, this event is full" },
        { status: 400 }
      )
    }

    if (error.message?.includes("Event not found")) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    if (error.message?.includes("No available ticket batches")) {
      return NextResponse.json(
        { error: "No available ticket batches at this time" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to claim ticket" },
      { status: 500 }
    )
  }
}