
import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { User, Role, AuthenticatedUser } from '../../types';
import { USER_ROLE_OPTIONS } from '../../constants';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
  onSave: (userData: Partial<User> & { passwordInput?: string }, isNew: boolean) => Promise<void>;
  currentUser: AuthenticatedUser | null;
}

const initialUserState: Partial<User> & { passwordInput?: string; confirmPassword?: string } = {
  name: '',
  email: '',
  role: Role.SALES_EXECUTIVE,
  passwordInput: '',
  confirmPassword: '',
};

const MODAL_TITLE_ID = "user-modal-title";

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, userToEdit, onSave, currentUser }) => {
  const [formData, setFormData] = useState(initialUserState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const isNewUser = !userToEdit;
  const isEditingSelf = currentUser?.id === userToEdit?.id;

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setFormData({
          id: userToEdit.id,
          name: userToEdit.name,
          email: userToEdit.email,
          role: userToEdit.role,
          passwordInput: '',
          confirmPassword: '',
        });
        setShowPasswordFields(false); // Hide password fields by default for edit
      } else {
        setFormData(initialUserState);
        setShowPasswordFields(true); // Show password fields by default for new user
      }
      setErrors({});
      setIsLoading(false);
    }
  }, [userToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = 'Name is required.';
    
    if (isNewUser) {
      if (!formData.email?.trim()) newErrors.email = 'Email is required.';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid.';
    }

    if (!formData.role) newErrors.role = 'Role is required.';

    if (isNewUser || showPasswordFields) {
      if (!formData.passwordInput?.trim()) {
        newErrors.passwordInput = 'Password is required.';
      } else if (formData.passwordInput.length < 6) {
        newErrors.passwordInput = 'Password must be at least 6 characters.';
      }
      if (formData.passwordInput !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
    }
    
    if (isEditingSelf && userToEdit?.role !== formData.role) {
        newErrors.role = "You cannot change your own role.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const dataToSave: Partial<User> & { passwordInput?: string } = {
      id: formData.id,
      name: formData.name,
      email: formData.email, // Email is part of User, but API might restrict its update
      role: formData.role,
    };

    if (isNewUser || showPasswordFields) {
      if (formData.passwordInput) { // Only include passwordInput if it's set (and valid)
          dataToSave.passwordInput = formData.passwordInput;
      }
    }
    
    try {
        await onSave(dataToSave, isNewUser);
        // onClose(); // Let parent handle close on success
    } catch (error: any) {
        setErrors(prev => ({ ...prev, form: error.message || 'Failed to save user. Please try again.' }));
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    if (isOpen) { // Only reset if modal is actually open
        setFormData(initialUserState);
        setErrors({});
        setShowPasswordFields(false);
    }
    onClose();
  };


  const roleOptions = USER_ROLE_OPTIONS.map(role => ({ value: role, label: role }));
  const modalTitle = isNewUser ? 'Add New User' : `Edit User: ${userToEdit?.name}`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} titleId={MODAL_TITLE_ID} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          id="name"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          error={errors.name}
          required
          disabled={isLoading}
        />
        <Input
          label="Email"
          id="email"
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={handleChange}
          error={errors.email}
          required={isNewUser}
          disabled={isLoading || !isNewUser} // Email is read-only for existing users
          aria-readonly={!isNewUser}
        />
        <Select
          label="Role"
          id="role"
          name="role"
          value={formData.role || ''}
          onChange={handleChange}
          options={roleOptions}
          error={errors.role}
          required
          disabled={isLoading || (isEditingSelf && currentUser?.role === Role.ADMIN)} // Admin cannot change their own role
        />

        {!isNewUser && (
          <div className="my-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-primary-600 rounded border-secondary-300 focus:ring-primary-500"
                checked={showPasswordFields}
                onChange={(e) => setShowPasswordFields(e.target.checked)}
                disabled={isLoading}
              />
              <span className="ml-2 text-sm text-secondary-700">Change Password</span>
            </label>
          </div>
        )}

        {(isNewUser || showPasswordFields) && (
          <>
            <Input
              label="Password"
              id="passwordInput"
              name="passwordInput"
              type="password"
              value={formData.passwordInput || ''}
              onChange={handleChange}
              error={errors.passwordInput}
              required={isNewUser || showPasswordFields} // Required if new or if checkbox is checked for edit
              disabled={isLoading}
            />
            <Input
              label="Confirm Password"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword || ''}
              onChange={handleChange}
              error={errors.confirmPassword}
              required={isNewUser || showPasswordFields} // Required if new or if checkbox is checked for edit
              disabled={isLoading}
            />
          </>
        )}
        
        {errors.form && <p className="mt-2 text-sm text-red-600" role="alert">{errors.form}</p>}
        
        <div className="pt-5">
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} disabled={isLoading}>
              {isNewUser ? 'Create User' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
