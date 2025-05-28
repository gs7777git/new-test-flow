
import React, { useState, useEffect, useCallback } from 'react';
import { User, Role, AuthenticatedUser } from '../types';
import { userService } from '../services/api';
import { Spinner } from '../components/common/Spinner';
import { Button } from '../components/common/Button';
import { PlusIcon, EditIcon, DeleteIcon } from '../components/common/Icons';
import { UserModal } from '../components/users/UserModal';
import { useAuth } from '../contexts/AuthContext';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false); // For general actions like save/delete
  const [isDataLoading, setIsDataLoading] = useState(true); // For initial data fetch
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { user: currentUser } = useAuth(); // Renamed to avoid conflict with map variable

  const fetchUsers = useCallback(async () => {
    if (!isDataLoading) setIsDataLoading(true); // Ensure data loading spinner shows if re-fetching
    try {
      const fetchedUsers = await userService.getUsers();
      setUsers(fetchedUsers || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
      alert(`Failed to fetch users: ${(error as Error).message}`);
    } finally {
      setIsDataLoading(false);
      setIsLoading(false); // Stop general loading too if it was active
    }
  }, [isDataLoading]); // Added isDataLoading to dependency array to allow re-trigger

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // fetchUsers callback is memoized

  const handleOpenModal = (user: User | null = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (userData: Partial<User> & { passwordInput?: string }, isNew: boolean) => {
    setIsLoading(true);
    try {
      if (isNew) {
        // For addUser, email and passwordInput are essential. Role and name too.
        const { name, email, role, passwordInput } = userData;
        if (!name || !email || !role || !passwordInput) {
            throw new Error("Missing required fields for new user.");
        }
        await userService.addUser({ name, email, role, passwordInput });
      } else if (editingUser && editingUser.id) {
        // For updateUser, email is not updatable via API. ID is editingUser.id.
        // userData will contain name, role, and optionally passwordInput.
        const { passwordInput, ...updateData } = userData;
        const payload: Partial<Omit<User, 'id' | 'email' | 'password'>> & { passwordInput?: string } = {
            name: updateData.name,
            role: updateData.role,
        };
        if (passwordInput) {
            payload.passwordInput = passwordInput;
        }
        await userService.updateUser(editingUser.id, payload);
      } else {
        throw new Error("Invalid operation: No user context for saving.");
      }
      fetchUsers(); // Refresh the list
      handleCloseModal(); // Close modal on success
    } catch (error) {
      console.error("Error saving user:", error);
      // Error will be displayed in the modal by UserModal's own error handling
      // alert(`Failed to save user: ${(error as Error).message}`); // Or handle error display here
      throw error; // Re-throw to let modal handle its own error display
    } finally {
      // setIsLoading(false); // Modal will set its own loading state. Page loading state is for delete/fetch.
      // Keep page setIsLoading(false) in fetchUsers finally block.
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      alert("You cannot delete yourself.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this user? This may affect lead assignments.')) {
        setIsLoading(true); // Page-level loading for delete
        try {
            await userService.deleteUser(userId);
            fetchUsers(); // Refresh list after delete
        } catch (error) {
            console.error("Error deleting user:", error);
            alert(`Failed to delete user: ${(error as Error).message}`);
            setIsLoading(false); // Stop loading on error
        }
        // setIsLoading(false) will be handled by fetchUsers' finally block on success
    }
  };

  if (isDataLoading && users.length === 0) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-secondary-900">User Management</h1>
        {currentUser?.role === Role.ADMIN && (
            <Button onClick={() => handleOpenModal()} leftIcon={<PlusIcon className="h-5 w-5" />} disabled={isLoading || isDataLoading}>
            Add New User
            </Button>
        )}
      </div>

      {(isLoading && !isModalOpen) && <div className="my-4"><Spinner /></div>} {/* Show spinner for page actions like delete if modal isn't open */}

      <div className="bg-white shadow overflow-x-auto rounded-lg">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Role</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {users.length === 0 && !isDataLoading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-secondary-500">No users found.</td></tr>
            ) : (
                users.map((user) => (
                <tr key={user.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {currentUser?.role === Role.ADMIN && (
                        <>
                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(user)} aria-label={`Edit ${user.name}`} disabled={isLoading || isDataLoading}>
                            <EditIcon className="h-4 w-4" />
                        </Button>
                        {user.id !== currentUser?.id && /* Prevent admin from deleting self */
                            <Button variant="danger" size="sm" onClick={() => handleDeleteUser(user.id)} aria-label={`Delete ${user.name}`} disabled={isLoading || isDataLoading}>
                                <DeleteIcon className="h-4 w-4" />
                            </Button>
                        }
                        </>
                    )}
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
      
      {isModalOpen && (
        <UserModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            userToEdit={editingUser}
            onSave={handleSaveUser}
            currentUser={currentUser}
        />
      )}
    </div>
  );
};
