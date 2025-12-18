import requests
import sys
import json
from datetime import datetime, timedelta

class PersonnelSchedulingTester:
    def __init__(self, base_url="https://workshift-calendar-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.stores = []
        self.shifts = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_seed_data(self):
        """Seed the database with test data"""
        success, response = self.run_test(
            "Seed Database",
            "POST",
            "seed",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin token: {self.admin_token}")
            return True
        return False

    def test_user_login(self):
        """Test regular user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": "john@example.com", "password": "user123"}
        )
        if success and 'token' in response:
            self.user_token = response['token']
            print(f"   User token: {self.user_token}")
            return True
        return False

    def test_invalid_login(self):
        """Test invalid login credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@example.com", "password": "wrong"}
        )
        return success

    def test_get_current_user(self, token, expected_role):
        """Test getting current user info"""
        success, response = self.run_test(
            f"Get Current User ({expected_role})",
            "GET",
            "auth/me",
            200,
            token=token
        )
        if success and response.get('role') == expected_role:
            print(f"   User role verified: {response.get('role')}")
            return True
        return False

    def test_get_stores(self, token, user_type):
        """Test getting stores for user"""
        success, response = self.run_test(
            f"Get Stores ({user_type})",
            "GET",
            "stores",
            200,
            token=token
        )
        if success and isinstance(response, list) and len(response) > 0:
            self.stores = response
            print(f"   Found {len(response)} stores")
            for store in response:
                print(f"   - {store['name']}: {len(store['time_slots'])} time slots")
            return True
        return False

    def test_get_store_details(self, token, user_type):
        """Test getting individual store details"""
        if not self.stores:
            return False
            
        store_id = self.stores[0]['id']
        success, response = self.run_test(
            f"Get Store Details ({user_type})",
            "GET",
            f"stores/{store_id}",
            200,
            token=token
        )
        if success and response.get('id') == store_id:
            print(f"   Store details: {response['name']}")
            return True
        return False

    def test_unauthorized_store_access(self):
        """Test accessing store user doesn't have permission for"""
        # Try to access store-3 with user token (user only has access to store-1 and store-2)
        success, response = self.run_test(
            "Unauthorized Store Access",
            "GET",
            "stores/store-3",
            403,
            token=self.user_token
        )
        return success

    def test_create_shift_user(self):
        """Test creating shift as regular user"""
        if not self.stores:
            return False
            
        # Get current week start (Monday)
        today = datetime.now()
        days_since_monday = today.weekday()
        week_start = (today - timedelta(days=days_since_monday)).strftime('%Y-%m-%d')
        
        store = self.stores[0]
        shift_data = {
            "store_id": store['id'],
            "day_of_week": 1,  # Tuesday
            "time_slot": store['time_slots'][0],
            "shift_type": "morning",
            "notes": "Test shift for user",
            "week_start": week_start
        }
        
        success, response = self.run_test(
            "Create Shift (User)",
            "POST",
            "shifts",
            200,
            data=shift_data,
            token=self.user_token
        )
        
        if success and response.get('status') == 'pending':
            self.shifts.append(response)
            print(f"   Shift created with status: {response['status']}")
            return True
        return False

    def test_create_shift_admin(self):
        """Test creating shift as admin (should be auto-approved)"""
        if not self.stores:
            return False
            
        today = datetime.now()
        days_since_monday = today.weekday()
        week_start = (today - timedelta(days=days_since_monday)).strftime('%Y-%m-%d')
        
        store = self.stores[0]
        shift_data = {
            "store_id": store['id'],
            "day_of_week": 2,  # Wednesday
            "time_slot": store['time_slots'][1],
            "shift_type": "evening",
            "notes": "Test shift for admin",
            "week_start": week_start
        }
        
        success, response = self.run_test(
            "Create Shift (Admin)",
            "POST",
            "shifts",
            200,
            data=shift_data,
            token=self.admin_token
        )
        
        if success and response.get('status') == 'approved':
            self.shifts.append(response)
            print(f"   Admin shift auto-approved: {response['status']}")
            return True
        return False

    def test_conflict_detection(self):
        """Test shift conflict detection"""
        if not self.stores or not self.shifts:
            return False
            
        # Try to create conflicting shift
        existing_shift = self.shifts[0]
        conflict_data = {
            "store_id": existing_shift['store_id'],
            "day_of_week": existing_shift['day_of_week'],
            "time_slot": existing_shift['time_slot'],
            "week_start": existing_shift['week_start']
        }
        
        success, response = self.run_test(
            "Conflict Detection",
            "POST",
            "shifts/check-conflict",
            200,
            data=conflict_data,
            token=self.user_token
        )
        
        if success and response.get('has_conflict') == True:
            print(f"   Conflict detected correctly")
            return True
        return False

    def test_get_shifts(self):
        """Test getting shifts for a store and week"""
        if not self.stores or not self.shifts:
            return False
            
        shift = self.shifts[0]
        params = {
            "store_id": shift['store_id'],
            "week_start": shift['week_start']
        }
        
        success, response = self.run_test(
            "Get Shifts",
            "GET",
            "shifts",
            200,
            data=params,
            token=self.user_token
        )
        
        if success and isinstance(response, list) and len(response) >= len(self.shifts):
            print(f"   Found {len(response)} shifts")
            return True
        return False

    def test_update_shift(self):
        """Test updating a shift"""
        if not self.shifts:
            return False
            
        shift = self.shifts[0]
        update_data = {
            "notes": "Updated test notes",
            "shift_type": "evening"
        }
        
        success, response = self.run_test(
            "Update Shift",
            "PUT",
            f"shifts/{shift['id']}",
            200,
            data=update_data,
            token=self.user_token
        )
        
        if success and response.get('notes') == "Updated test notes":
            print(f"   Shift updated successfully")
            return True
        return False

    def test_approve_shift(self):
        """Test admin approving a pending shift"""
        if not self.shifts:
            return False
            
        # Find a pending shift
        pending_shift = None
        for shift in self.shifts:
            if shift['status'] == 'pending':
                pending_shift = shift
                break
                
        if not pending_shift:
            print("   No pending shifts to approve")
            return True
            
        success, response = self.run_test(
            "Approve Shift",
            "POST",
            f"shifts/{pending_shift['id']}/approve",
            200,
            token=self.admin_token
        )
        
        if success and response.get('status') == 'approved':
            print(f"   Shift approved successfully")
            return True
        return False

    def test_reject_shift(self):
        """Test admin rejecting a shift"""
        # Create another shift to reject
        if not self.stores:
            return False
            
        today = datetime.now()
        days_since_monday = today.weekday()
        week_start = (today - timedelta(days=days_since_monday)).strftime('%Y-%m-%d')
        
        store = self.stores[0]
        shift_data = {
            "store_id": store['id'],
            "day_of_week": 3,  # Thursday
            "time_slot": store['time_slots'][2],
            "shift_type": "night",
            "notes": "Shift to be rejected",
            "week_start": week_start
        }
        
        # Create shift as user
        success, shift_response = self.run_test(
            "Create Shift for Rejection",
            "POST",
            "shifts",
            200,
            data=shift_data,
            token=self.user_token
        )
        
        if not success:
            return False
            
        # Now reject it as admin
        success, response = self.run_test(
            "Reject Shift",
            "POST",
            f"shifts/{shift_response['id']}/reject",
            200,
            token=self.admin_token
        )
        
        if success and response.get('status') == 'rejected':
            print(f"   Shift rejected successfully")
            return True
        return False

    def test_user_cannot_approve(self):
        """Test that regular users cannot approve shifts"""
        if not self.shifts:
            return False
            
        shift = self.shifts[0]
        success, response = self.run_test(
            "User Cannot Approve",
            "POST",
            f"shifts/{shift['id']}/approve",
            403,
            token=self.user_token
        )
        return success

    def test_delete_shift_admin(self):
        """Test admin deleting a shift"""
        if not self.shifts:
            return False
            
        shift = self.shifts[-1]  # Delete the last created shift
        success, response = self.run_test(
            "Delete Shift (Admin)",
            "DELETE",
            f"shifts/{shift['id']}",
            200,
            token=self.admin_token
        )
        
        if success:
            print(f"   Shift deleted successfully")
            return True
        return False

    def test_user_cannot_delete(self):
        """Test that regular users cannot delete shifts"""
        if not self.shifts:
            return False
            
        shift = self.shifts[0]
        success, response = self.run_test(
            "User Cannot Delete",
            "DELETE",
            f"shifts/{shift['id']}",
            403,
            token=self.user_token
        )
        return success

def main():
    print("🚀 Starting Personnel Scheduling System API Tests")
    print("=" * 60)
    
    tester = PersonnelSchedulingTester()
    
    # Test sequence
    tests = [
        ("Seed Database", tester.test_seed_data),
        ("Admin Login", tester.test_admin_login),
        ("User Login", tester.test_user_login),
        ("Invalid Login", tester.test_invalid_login),
        ("Admin User Info", lambda: tester.test_get_current_user(tester.admin_token, "admin")),
        ("User User Info", lambda: tester.test_get_current_user(tester.user_token, "user")),
        ("Admin Get Stores", lambda: tester.test_get_stores(tester.admin_token, "admin")),
        ("User Get Stores", lambda: tester.test_get_stores(tester.user_token, "user")),
        ("Admin Store Details", lambda: tester.test_get_store_details(tester.admin_token, "admin")),
        ("User Store Details", lambda: tester.test_get_store_details(tester.user_token, "user")),
        ("Unauthorized Store Access", tester.test_unauthorized_store_access),
        ("Create Shift (User)", tester.test_create_shift_user),
        ("Create Shift (Admin)", tester.test_create_shift_admin),
        ("Conflict Detection", tester.test_conflict_detection),
        ("Get Shifts", tester.test_get_shifts),
        ("Update Shift", tester.test_update_shift),
        ("Approve Shift", tester.test_approve_shift),
        ("Reject Shift", tester.test_reject_shift),
        ("User Cannot Approve", tester.test_user_cannot_approve),
        ("Delete Shift (Admin)", tester.test_delete_shift_admin),
        ("User Cannot Delete", tester.test_user_cannot_delete),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n🎉 All tests passed!")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())