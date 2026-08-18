import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.username || !body.password) {
      return NextResponse.json(
        { error: 'Roll Number and Password are required to sign in.' },
        { status: 400 }
      );
    }

    const username = String(body.username).trim().toUpperCase();
    const password = String(body.password);

    if (username.length < 5) {
      return NextResponse.json(
        { error: 'Please enter a valid MITS Roll Number.' },
        { status: 400 }
      );
    }

    const response = await fetch('https://attendance-optimizer-mb8g.onrender.com/api/gems-scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch attendance data from MITS GEMS. Verify credentials.' },
        { status: response.status }
      );
    }

    // Process each subject to ensure exact attendance
    const exactAttendance = (data.attendance || []).map((item) => {
      const realAttended = item.rawAttended !== undefined 
        ? Number(item.rawAttended) 
        : Number(item.attended || 0);
      const conducted = Number(item.conducted || 0);
      const percentage = conducted > 0 ? (realAttended / conducted) * 100 : 0;
      const safe_bunks = Math.max(0, Math.floor((realAttended / 0.75) - conducted));

      return {
        ...item,
        attended: realAttended,
        conducted: conducted,
        percentage: Number(percentage.toFixed(2)),
        safe_bunks: safe_bunks,
        gemsPendingSync: false,
      };
    });

    // Calculate exact overall attendance
    const totalAttended = exactAttendance.reduce((sum, i) => sum + i.attended, 0);
    const totalConducted = exactAttendance.reduce((sum, i) => sum + i.conducted, 0);
    const overallPercentage = totalConducted > 0 
      ? Number(((totalAttended / totalConducted) * 100).toFixed(2)) 
      : 0;

    const cleanedData = {
      ...data,
      attendance: exactAttendance,
      overallAttendance: {
        attended: totalAttended,
        conducted: totalConducted,
        percentage: overallPercentage,
        label: 'Exact GEMS Attendance',
      },
    };

    return NextResponse.json(cleanedData);
  } catch (error) {
    console.error('Attendance API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while connecting to MITS GEMS portal.' },
      { status: 500 }
    );
  }
}
