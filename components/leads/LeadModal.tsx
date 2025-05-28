
import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Textarea } from '../common/Input';
import { Select } from '../common/Select';
import { Lead, LeadStatus, User } from '../../types';
import { LEAD_STATUS_OPTIONS } from '../../constants';
import { userService } from '../../services/api'; 
import { Spinner } from '../common/Spinner';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: Lead | null;
  onSave: (lead: Lead) => void;
  viewMode?: boolean;
}

const initialLeadState: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedToName'> = {
  name: '',
  email: '',
  phone: '',
  source: '',
  status: LeadStatus.NEW,
  assignedToId: null,
  notes: '',
};

const MODAL_TITLE_ID = "lead-modal-title";

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, leadToEdit, onSave, viewMode = false }) => {
  const [leadData, setLeadData] = useState<Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedToName'>>(initialLeadState);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false); 
  const [isUsersLoading, setIsUsersLoading] = useState(false); 
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) { 
        setIsUsersLoading(true);
        const fetchUsers = async () => {
          try {
            const fetchedUsers = await userService.getUsers();
            setUsers(fetchedUsers);
          } catch (err) {
            console.error("Failed to fetch users:", err);
            setUsers([]);
          } finally {
            setIsUsersLoading(false);
          }
        };
        fetchUsers();

        if (leadToEdit) {
            setLeadData({
            name: leadToEdit.name,
            email: leadToEdit.email,
            phone: leadToEdit.phone,
            source: leadToEdit.source,
            status: leadToEdit.status,
            assignedToId: leadToEdit.assignedToId,
            notes: leadToEdit.notes,
            });
        } else {
            setLeadData(initialLeadState);
        }
        setErrors({});
    }
  }, [leadToEdit, isOpen]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLeadData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!leadData.name.trim()) newErrors.name = 'Name is required.';
    if (!leadData.email.trim()) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(leadData.email)) newErrors.email = 'Email is invalid.';
    if (!leadData.phone.trim()) newErrors.phone = 'Phone is required.';
    else if (!/^[0-9+\-() ]{7,}$/.test(leadData.phone)) newErrors.phone = 'Phone number is invalid.';
    if (!leadData.source.trim()) newErrors.source = 'Source is required.';
    if (!leadData.status) newErrors.status = 'Status is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode) return;
    if (!validate()) return;
    setIsLoading(true);
    try {
      const finalLeadData: any = { 
        ...leadData,
      };
      if (leadToEdit) {
        finalLeadData.id = leadToEdit.id;
        finalLeadData.createdAt = leadToEdit.createdAt; 
      }
      onSave(finalLeadData as Lead); 
    } catch (error) {
      console.error("Error saving lead (in modal):", error);
      setErrors(prev => ({ ...prev, form: 'Failed to save lead. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    if (isOpen) {
        setLeadData(initialLeadState);
        setErrors({});
    }
    onClose();
  };

  const userOptions = users.map(u => ({ value: u.id, label: u.name }));
  const statusOptions = LEAD_STATUS_OPTIONS.map(status => ({ value: status, label: status }));

  const modalTitle = viewMode ? `Lead Details: ${leadToEdit?.name}` : (leadToEdit ? 'Edit Lead' : 'Add New Lead');
  
  const getStatusColorClasses = (status: LeadStatus) => {
    switch (status) {
      case LeadStatus.CONVERTED:
        return 'bg-primary-100 text-primary-800';
      case LeadStatus.LOST:
        return 'bg-red-100 text-red-800';
      case LeadStatus.QUALIFIED:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} titleId={MODAL_TITLE_ID} size={viewMode ? "md" : "xl"}>
      {isUsersLoading && (
        <div className="flex flex-col items-center justify-center p-4">
          <Spinner size="md" />
          <p className="mt-2 text-sm text-secondary-600">Loading users...</p>
        </div>
      )}
      {!isUsersLoading && viewMode && leadToEdit ? (
        <div className="space-y-3 text-sm">
          <p><strong>Name:</strong> {leadToEdit.name}</p>
          <p><strong>Email:</strong> {leadToEdit.email}</p>
          <p><strong>Phone:</strong> {leadToEdit.phone}</p>
          <p><strong>Source:</strong> {leadToEdit.source}</p>
          <p><strong>Status:</strong> <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColorClasses(leadToEdit.status)}`}>{leadToEdit.status}</span></p>
          <p><strong>Assigned To:</strong> {leadToEdit.assignedToName || (users.find(u => u.id === leadToEdit.assignedToId)?.name || 'Unassigned')}</p>
          <div className="max-h-28 overflow-y-auto"><strong className="block">Notes:</strong> {leadToEdit.notes ? <div className="whitespace-pre-wrap">{leadToEdit.notes}</div> : 'N/A'}</div>
          <p><strong>Created At:</strong> {new Date(leadToEdit.createdAt).toLocaleString()}</p>
          <p><strong>Last Updated:</strong> {new Date(leadToEdit.updatedAt).toLocaleString()}</p>
        </div>
      ) : !isUsersLoading && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            id="name"
            name="name"
            value={leadData.name}
            onChange={handleChange}
            error={errors.name}
            required
            disabled={isLoading}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && <p id="name-error" className="sr-only">{errors.name}</p>}

          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            value={leadData.email}
            onChange={handleChange}
            error={errors.email}
            required
            disabled={isLoading}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && <p id="email-error" className="sr-only">{errors.email}</p>}
          
          <Input
            label="Phone"
            id="phone"
            name="phone"
            type="tel"
            value={leadData.phone}
            onChange={handleChange}
            error={errors.phone}
            required
            disabled={isLoading}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && <p id="phone-error" className="sr-only">{errors.phone}</p>}

          <Input
            label="Source"
            id="source"
            name="source"
            value={leadData.source}
            onChange={handleChange}
            error={errors.source}
            required
            disabled={isLoading}
            aria-describedby={errors.source ? "source-error" : undefined}
          />
          {errors.source && <p id="source-error" className="sr-only">{errors.source}</p>}

          <Select
            label="Status"
            id="status"
            name="status"
            value={leadData.status}
            onChange={handleChange}
            options={statusOptions}
            error={errors.status}
            required
            disabled={isLoading}
            aria-describedby={errors.status ? "status-error" : undefined}
          />
          {errors.status && <p id="status-error" className="sr-only">{errors.status}</p>}

          <Select
            label="Assigned To"
            id="assignedToId"
            name="assignedToId"
            value={leadData.assignedToId || ''}
            onChange={handleChange}
            options={[{ value: '', label: 'Unassigned' }, ...userOptions]}
            error={errors.assignedToId}
            disabled={isLoading || isUsersLoading}
            aria-describedby={errors.assignedToId ? "assignedToId-error" : undefined}
          />
          {errors.assignedToId && <p id="assignedToId-error" className="sr-only">{errors.assignedToId}</p>}

          <Textarea
            label="Notes"
            id="notes"
            name="notes"
            value={leadData.notes}
            onChange={handleChange}
            error={errors.notes}
            rows={4}
            disabled={isLoading}
            aria-describedby={errors.notes ? "notes-error" : undefined}
          />
          {errors.notes && <p id="notes-error" className="sr-only">{errors.notes}</p>}
          
          {errors.form && <p className="mt-2 text-sm text-red-600" role="alert">{errors.form}</p>}
          
          <div className="pt-5">
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading} disabled={isLoading || isUsersLoading}>
                {leadToEdit ? 'Save Changes' : 'Create Lead'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};