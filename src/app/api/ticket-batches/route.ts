// src/app/api/ticket-batches/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { nanoid } from "nanoid" // Import nanoid for ID generation

// GET - Fetch all ticket batches
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const batches = await prisma.ticket_batches.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(batches)
  } catch (error) {
    console.error("Error fetching ticket batches:", error)
    return NextResponse.json(
      { error: "Failed to fetch ticket batches" },
      { status: 500 }
    )
  }
}

// POST - Create new ticket batch
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { name, quota, startDate, endDate } = await request.json()

    if (!name || !quota || !startDate || !endDate) {
      return NextResponse.json(
        { error: "All fields are required: name, quota, startDate, endDate" },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json(
        { error: "Start date must be earlier than end date" },
        { status: 400 }
      )
    }

    // FIXED: Generate ID for ticket batch
    const batchId = nanoid() // or use crypto.randomUUID() if available

    const newBatch = await prisma.ticket_batches.create({
      data: {
        id: batchId, // ✅ FIXED: Add the missing ID
        name,
        quota: parseInt(quota),
        available: parseInt(quota), // Initially all tickets are available
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })

    return NextResponse.json(newBatch)
  } catch (error) {
    console.error("Error creating ticket batch:", error)
    return NextResponse.json(
      { error: "Failed to create ticket batch" },
      { status: 500 }
    )
  }
}

// PUT - Update ticket batch
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { id, name, quota, startDate, endDate, isActive } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      )
    }

    // Get current batch to calculate available tickets
    const currentBatch = await prisma.ticket_batches.findUnique({
      where: { id }
    })

    if (!currentBatch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      )
    }

    // Calculate new available count if quota changed
    let newAvailable = currentBatch.available
    if (quota && parseInt(quota) !== currentBatch.quota) {
      const usedTickets = currentBatch.quota - currentBatch.available
      newAvailable = parseInt(quota) - usedTickets
      
      // Ensure available count doesn't go negative
      if (newAvailable < 0) {
        return NextResponse.json(
          { error: "New quota cannot be less than already sold tickets" },
          { status: 400 }
        )
      }
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (start >= end) {
        return NextResponse.json(
          { error: "Start date must be earlier than end date" },
          { status: 400 }
        )
      }
    }

    const updatedBatch = await prisma.ticket_batches.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(quota && { quota: parseInt(quota), available: newAvailable }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      }
    })

    return NextResponse.json(updatedBatch)
  } catch (error) {
    console.error("Error updating ticket batch:", error)
    return NextResponse.json(
      { error: "Failed to update ticket batch" },
      { status: 500 }
    )
  }
}

// DELETE - Delete ticket batch
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      )
    }

    // Check if batch has any tickets claimed
    const ticketCount = await prisma.ticket.count({
      where: { batchId: id }
    })

    if (ticketCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete batch with claimed tickets" },
        { status: 400 }
      )
    }

    await prisma.ticket_batches.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Batch deleted successfully" })
  } catch (error) {
    console.error("Error deleting ticket batch:", error)
    return NextResponse.json(
      { error: "Failed to delete ticket batch" },
      { status: 500 }
    )
  }
}