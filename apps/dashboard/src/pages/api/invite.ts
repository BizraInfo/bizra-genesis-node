/**
 * BIZRA Genesis Node - Alpha Invitation API
 * Handles requests for the first 100 alpha users
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface InvitationRequest {
  name: string;
  email: string;
  reason: string;
  experience: string;
}

interface InvitationResponse {
  success: boolean;
  message: string;
  invitationId?: string;
  position?: number;
}

// Mock database - in production, this would be a real database
const invitationQueue: InvitationRequest[] = [];
const MAX_INVITATIONS = 100;
const RESERVED_SPOTS = 53; // Already taken

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<InvitationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { name, email, reason, experience }: InvitationRequest = req.body;

    // Validation
    if (!name || !email || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and reason are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if email already exists
    const existingInvitation = invitationQueue.find(inv => inv.email === email);
    if (existingInvitation) {
      return res.status(409).json({
        success: false,
        message: 'An invitation request already exists for this email address'
      });
    }

    // Check if we're at capacity
    const totalRequests = invitationQueue.length + RESERVED_SPOTS;
    if (totalRequests >= MAX_INVITATIONS) {
      return res.status(429).json({
        success: false,
        message: 'Alpha program is currently at capacity. Please check back later.'
      });
    }

    // Add to queue
    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    invitationQueue.push({
      name,
      email,
      reason,
      experience
    });

    const position = invitationQueue.length + RESERVED_SPOTS;

    // In production, you would:
    // 1. Store in database
    // 2. Send confirmation email
    // 3. Queue for review process
    // 4. Send invitation email when approved

    console.log(`New invitation request: ${name} (${email}) - Position: ${position}/${MAX_INVITATIONS}`);

    res.status(201).json({
      success: true,
      message: `Your invitation request has been received. You are position ${position} in the queue.`,
      invitationId,
      position
    });

  } catch (error) {
    console.error('Invitation API error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request. Please try again.'
    });
  }
}

// GET endpoint to check queue status
export async function getQueueStatus() {
  const totalRequests = invitationQueue.length + RESERVED_SPOTS;
  const spotsRemaining = Math.max(0, MAX_INVITATIONS - totalRequests);

  return {
    totalInvitations: MAX_INVITATIONS,
    reservedSpots: RESERVED_SPOTS,
    pendingRequests: invitationQueue.length,
    spotsRemaining,
    isFull: totalRequests >= MAX_INVITATIONS
  };
}