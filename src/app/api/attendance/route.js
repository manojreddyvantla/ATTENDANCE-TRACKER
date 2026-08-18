import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
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

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch attendance data from MITS GEMS' },
        { status: response.status }
      );
    }

    // Process each subject to ensure EXACT real GEMS attendance (without artificial credits/predictions)
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

    // Calculate exact overall attendance directly from exact subject numbers
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
