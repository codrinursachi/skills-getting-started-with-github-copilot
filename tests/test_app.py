"""
Tests for the Mergington High School Activities API
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app import app, activities


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


@pytest.fixture
def reset_activities():
    """Reset activities to initial state after each test"""
    import copy
    original_activities = copy.deepcopy(activities)
    yield
    # Reset after test
    for name in activities:
        activities[name]["participants"] = original_activities[name]["participants"][:]


class TestGetActivities:
    """Tests for GET /activities endpoint"""

    def test_get_activities(self, client):
        """Test retrieving all activities"""
        response = client.get("/activities")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert isinstance(data, dict)
        assert "Chess Club" in data
        assert "Programming Class" in data
        
    def test_get_activities_has_required_fields(self, client):
        """Test that activities have required fields"""
        response = client.get("/activities")
        data = response.json()
        
        for activity_name, activity_details in data.items():
            assert "description" in activity_details
            assert "schedule" in activity_details
            assert "max_participants" in activity_details
            assert "participants" in activity_details
            assert isinstance(activity_details["participants"], list)


class TestSignup:
    """Tests for POST /activities/{activity_name}/signup endpoint"""

    def test_signup_new_participant(self, client, reset_activities):
        """Test signing up a new participant"""
        response = client.post(
            "/activities/Chess%20Club/signup?email=newstudent@mergington.edu"
        )
        assert response.status_code == 200
        data = response.json()
        assert "Signed up" in data["message"]
        assert "newstudent@mergington.edu" in data["message"]
        
        # Verify participant was added
        activities_response = client.get("/activities")
        activities_data = activities_response.json()
        assert "newstudent@mergington.edu" in activities_data["Chess Club"]["participants"]

    def test_signup_duplicate_participant(self, client, reset_activities):
        """Test that duplicate signups are rejected"""
        # First signup should succeed
        response1 = client.post(
            "/activities/Chess%20Club/signup?email=duplicate@mergington.edu"
        )
        assert response1.status_code == 200
        
        # Second signup with same email should fail
        response2 = client.post(
            "/activities/Chess%20Club/signup?email=duplicate@mergington.edu"
        )
        assert response2.status_code == 400
        data = response2.json()
        assert "already signed up" in data["detail"]

    def test_signup_nonexistent_activity(self, client):
        """Test signing up for an activity that doesn't exist"""
        response = client.post(
            "/activities/Nonexistent%20Activity/signup?email=student@mergington.edu"
        )
        assert response.status_code == 404
        data = response.json()
        assert "Activity not found" in data["detail"]

    def test_signup_multiple_activities(self, client, reset_activities):
        """Test that a student can sign up for multiple activities"""
        email = "multi@mergington.edu"
        
        response1 = client.post(
            f"/activities/Chess%20Club/signup?email={email}"
        )
        assert response1.status_code == 200
        
        response2 = client.post(
            f"/activities/Programming%20Class/signup?email={email}"
        )
        assert response2.status_code == 200
        
        # Verify both signups
        activities_response = client.get("/activities")
        activities_data = activities_response.json()
        assert email in activities_data["Chess Club"]["participants"]
        assert email in activities_data["Programming Class"]["participants"]

    def test_signup_max_participants_reached(self, client, reset_activities):
        """Test that signups are rejected when activity reaches max capacity"""
        # Get Chess Club which has max_participants of 12
        activities_response = client.get("/activities")
        chess_club = activities_response.json()["Chess Club"]
        max_participants = chess_club["max_participants"]
        current_participants = len(chess_club["participants"])
        
        # Sign up students until we reach max capacity
        spots_available = max_participants - current_participants
        for i in range(spots_available):
            response = client.post(
                f"/activities/Chess%20Club/signup?email=student{i}@mergington.edu"
            )
            assert response.status_code == 200
        
        # Try to sign up one more student (should fail)
        response = client.post(
            "/activities/Chess%20Club/signup?email=overflow@mergington.edu"
        )
        assert response.status_code == 400
        data = response.json()
        assert "maximum capacity" in data["detail"]

    def test_signup_empty_email(self, client):
        """Test that signup with empty email is rejected"""
        response = client.post("/activities/Chess%20Club/signup?email=")
        assert response.status_code == 400
        data = response.json()
        assert "Email is required" in data["detail"]


class TestUnregister:
    """Tests for POST /activities/{activity_name}/unregister endpoint"""

    def test_unregister_existing_participant(self, client, reset_activities):
        """Test unregistering an existing participant"""
        # Get initial participant
        activities_response = client.get("/activities")
        initial_participants = activities_response.json()["Chess Club"]["participants"].copy()
        assert len(initial_participants) > 0
        
        email = initial_participants[0]
        
        # Unregister the participant
        response = client.post(
            f"/activities/Chess%20Club/unregister?email={email}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "Unregistered" in data["message"]
        
        # Verify participant was removed
        activities_response = client.get("/activities")
        participants = activities_response.json()["Chess Club"]["participants"]
        assert email not in participants

    def test_unregister_nonexistent_participant(self, client):
        """Test unregistering someone not signed up"""
        response = client.post(
            "/activities/Chess%20Club/unregister?email=notregistered@mergington.edu"
        )
        assert response.status_code == 400
        data = response.json()
        assert "not signed up" in data["detail"]

    def test_unregister_from_nonexistent_activity(self, client):
        """Test unregistering from an activity that doesn't exist"""
        response = client.post(
            "/activities/Nonexistent%20Activity/unregister?email=student@mergington.edu"
        )
        assert response.status_code == 404
        data = response.json()
        assert "Activity not found" in data["detail"]

    def test_unregister_empty_email(self, client):
        """Test that unregister with empty email is rejected"""
        response = client.post("/activities/Chess%20Club/unregister?email=")
        assert response.status_code == 400
        data = response.json()
        assert "Email is required" in data["detail"]


class TestIntegration:
    """Integration tests"""

    def test_signup_and_unregister_flow(self, client, reset_activities):
        """Test complete signup and unregister flow"""
        email = "integration@mergington.edu"
        activity = "Programming%20Class"
        
        # Sign up
        signup_response = client.post(f"/activities/{activity}/signup?email={email}")
        assert signup_response.status_code == 200
        
        # Verify signup
        activities_response = client.get("/activities")
        assert email in activities_response.json()["Programming Class"]["participants"]
        
        # Unregister
        unregister_response = client.post(f"/activities/{activity}/unregister?email={email}")
        assert unregister_response.status_code == 200
        
        # Verify unregister
        activities_response = client.get("/activities")
        assert email not in activities_response.json()["Programming Class"]["participants"]

    def test_participant_count_changes(self, client, reset_activities):
        """Test that participant counts change correctly"""
        email = "counter@mergington.edu"
        
        # Get initial count
        activities_response = client.get("/activities")
        initial_count = len(activities_response.json()["Art Club"]["participants"])
        
        # Sign up
        client.post("/activities/Art%20Club/signup?email=" + email)
        activities_response = client.get("/activities")
        after_signup_count = len(activities_response.json()["Art Club"]["participants"])
        assert after_signup_count == initial_count + 1
        
        # Unregister
        client.post("/activities/Art%20Club/unregister?email=" + email)
        activities_response = client.get("/activities")
        after_unregister_count = len(activities_response.json()["Art Club"]["participants"])
        assert after_unregister_count == initial_count
