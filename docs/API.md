# MITS Attendance Tracker - API Reference

## Endpoints

### 1. `POST /api/attendance`

Authenticates with MITS GEMS and returns structured live attendance data.

#### Request Body
```json
{
  "username": "21691A32XX",
  "password": "StudentGemsPassword"
}
```

#### Success Response (`200 OK`)
```json
{
  "student": {
    "name": "Manoj Kumar Reddy",
    "rollNo": "21691A32XX"
  },
  "attendance": [
    {
      "code": "20CSE301",
      "subjectName": "Deep Learning & Neural Networks",
      "attended": 38,
      "conducted": 42,
      "percentage": 90.48,
      "safe_bunks": 8
    }
  ],
  "overallAttendance": {
    "attended": 180,
    "conducted": 210,
    "percentage": 85.71,
    "label": "Exact GEMS Attendance"
  }
}
```

#### Error Response (`400 / 401 / 500`)
```json
{
  "error": "Failed to login to MITS GEMS. Check your Roll Number and Password."
}
```
