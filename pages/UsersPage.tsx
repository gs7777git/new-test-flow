
import React, { useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { userService } from '../services/api'; // Updated import
import { Spinner } from '../components/common/Spinner';
import { Button } from '../components/common/Button';
import { PlusIcon, EditIcon, DeleteIcon } from '../components/common/Icons';
// import { UserModal } from '../components/users/UserModal'; // TODO: Create UserModal
import { useAuth } from '../contexts/AuthContext';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true); // For initial data fetch
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [editingUser, setEditingUser] = useState<User | null>(null);
  const { user: currentUser, hasRole } = useAuth();


  const fetchUsers = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const fetchedUsers = await userService.getUsers();
      setUsers(fetchedUsers || []); // Ensure array
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
      // TODO: Show error
    } finally {
      setIsDataLoading(false);
      setIsLoading(false); // Also set main loading to false
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // const handleOpenModal = (user: User | null = null) => {
  //   setEditingUser(user);
  //   setIsModalOpen(true);
  // };

  // const handleCloseModal = () => {
  //   setIsModalOpen(false);
  //   setEditingUser(null);
  // };

  // const handleSaveUser = async (userToSave: User) => { // Renamed parameter
  //   setIsLoading(true);
  //   try {
  //     if (editingUser) {
  //       await userService.updateUser(editingUser.id, userToSave);
  //     } else {
  //       // Ensure passwordInput is handled if UserModal provides it
  //       // This part needs UserModal implementation details
  //       await userService.addUser(userToSave as Omit<User, 'id'> & {passwordInput: string});
  //     }
  //     fetchUsers();
  //     handleCloseModal();
  //   } catch (error) {
  //     console.error("Error saving user:", error);
  //     alert(`Failed to save user: ${(error as Error).message}`);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  
  const handleDeleteUser = async (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      alert("You cannot delete yourself.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this user? This may affect lead assignments if not handled by the backend worker.')) {
        setIsLoading(true);
        try {
            await userService.deleteUser(userId);
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            alert(`Failed to delete user: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }
  };


  if (isDataLoading && users.length === 0) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-secondary-900">User Management</h1>
        {/* TODO: Implement Add User Modal and functionality */}
        {/* {hasRole(Role.ADMIN) && 
            <Button onClick={() => handleOpenModal()} leftIcon={<PlusIcon className="h-5 w-5" />} disabled={isLoading}>
            Add New User
            </Button>
        } */}
        <p className="text-sm text-secondary-600">(User Add/Edit Modal & Functionality Coming Soon)</p>
      </div>

      {isLoading && <div className="my-4"><Spinner /></div>}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Role</th>
              {/* Assigned Leads column removed */}
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-secondary-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{user.role}</td>
                {/* Assigned Leads data cell removed */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {/* TODO: Implement Edit User Modal and functionality */}
                  {/* {hasRole(Role.ADMIN) &&
                    <Button variant="outline" size="sm" onClick={() => handleOpenModal(user)} aria-label={`Edit ${user.name}`} disabled={isLoading}>
                        <EditIcon className="h-4 w-4" />
                    </Button>
                  } */}
                  {hasRole(Role.ADMIN) && user.id !== currentUser?.id && /* Prevent admin from deleting self */
                    <Button variant="danger" size="sm" onClick={() => handleDeleteUser(user.id)} aria-label={`Delete ${user.name}`} disabled={isLoading}>
                        <DeleteIcon className="h-4 w-4" />
                    </Button>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* TODO: Implement UserModal */}
      {/* {isModalOpen && (
        <UserModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            userToEdit={editingUser}
            onSave={handleSaveUser}
        />
      )} */}
    </div>
  );
};
