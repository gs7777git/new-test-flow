
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../components/common/Button';
import { LeadModal } from '../components/leads/LeadModal';
import { Lead, LeadStatus, Role, User } from '../types';
import { leadService, userService } from '../services/api'; // Updated imports
import { PlusIcon, EditIcon, EyeIcon, DeleteIcon } from '../components/common/Icons';
import { Spinner } from '../components/common/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { LEAD_STATUS_OPTIONS, DEFAULT_FILTERS } from '../constants';

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true); // For initial data fetch
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { user, hasRole } = useAuth();

  const fetchData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const [fetchedLeads, fetchedUsers] = await Promise.all([
        leadService.getLeads(),
        userService.getUsers()
      ]);
      setLeads(fetchedLeads || []); // Ensure array even if API returns null/undefined
      setUsers(fetchedUsers || []);   // Ensure array
    } catch (error) {
      console.error("Failed to fetch leads or users:", error);
      setLeads([]); // Set to empty on error to avoid processing undefined
      setUsers([]);
      // TODO: Show error to user
    } finally {
      setIsDataLoading(false);
      setIsLoading(false); // Also set main loading to false after initial data fetch
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const processedLeads = useMemo(() => {
    if (!leads || !users) return [];
    return leads.map(lead => ({
      ...lead,
      assignedToName: users.find(u => u.id === lead.assignedToId)?.name || 'Unassigned'
    }));
  }, [leads, users]);

  const handleOpenModal = (lead: Lead | null = null, view: boolean = false) => {
    // Pass the processed lead (with assignedToName) to the modal if it's an existing lead
    const leadToPass = lead ? processedLeads.find(pLead => pLead.id === lead.id) || lead : null;
    setEditingLead(leadToPass);
    setIsViewMode(view);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLead(null);
    setIsViewMode(false);
  };

  const handleSaveLead = async (leadFormData: Lead) => {
    // The leadFormData from modal might not have id if new, or might have stale assignedToName.
    // We only care about core fields for saving. assignedToName is re-derived.
    setIsLoading(true); 
    try {
      if (editingLead && editingLead.id) { // If it's an update
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { assignedToName, ...dataToUpdate } = leadFormData;
        await leadService.updateLead(editingLead.id, dataToUpdate);
      } else { // If it's a new lead
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, updatedAt, assignedToName, ...dataToAdd } = leadFormData;
        await leadService.addLead(dataToAdd as Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'assignedToName'>);
      }
      fetchData(); // Refresh list which will also re-process names
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save lead:", error);
      // TODO: Show error in modal or page, do not close modal on error from onSave
      alert(`Error saving lead: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      setIsLoading(true);
      try {
        await leadService.deleteLead(leadId);
        fetchData(); // Refresh list
      } catch (error) {
        console.error("Failed to delete lead:", error);
        alert(`Error deleting lead: ${(error as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const filteredLeads = useMemo(() => {
    return processedLeads.filter(lead => {
        const searchMatch = 
            lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (lead.assignedToName && lead.assignedToName.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const statusMatch = filters.status ? lead.status === filters.status : true;
        const sourceMatch = filters.source ? lead.source.toLowerCase().includes(filters.source.toLowerCase()) : true;
        
        return searchMatch && statusMatch && sourceMatch;
    });
  }, [processedLeads, searchTerm, filters]);
  
  const leadStatusOptions = [{value: '', label: 'All Statuses'}, ...LEAD_STATUS_OPTIONS.map(s => ({value: s, label: s}))];
  const sourceOptions = useMemo(() => {
    if (!leads) return [{ value: '', label: 'All Sources' }];
    return [{value: '', label: 'All Sources'}, ...Array.from(new Set(leads.map(l => l.source))).map(s => ({value: s, label:s})) ];
  }, [leads]);


  const getStatusColorClasses = (status: LeadStatus) => {
    switch (status) {
      case LeadStatus.CONVERTED:
        return 'bg-primary-100 text-primary-800';
      case LeadStatus.LOST:
        return 'bg-red-100 text-red-800';
      case LeadStatus.QUALIFIED:
        return 'bg-yellow-100 text-yellow-800'; 
      case LeadStatus.CONTACTED:
        return 'bg-blue-100 text-blue-800'; 
      default: 
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  if (isDataLoading && leads.length === 0) { 
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-secondary-900">Leads Management</h1>
        { (hasRole([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE])) &&
            <Button onClick={() => handleOpenModal()} leftIcon={<PlusIcon className="h-5 w-5" />} disabled={isLoading}>
            Add New Lead
            </Button>
        }
      </div>

      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input 
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:col-span-1"
                wrapperClassName="relative"
            />
             <Select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                options={leadStatusOptions}
                wrapperClassName="md:col-span-1"
            />
            <Input // Changed to Input for free-text source filtering, or use Select with dynamic sourceOptions
                name="source"
                placeholder="Filter by source..."
                value={filters.source}
                onChange={handleFilterChange}
                wrapperClassName="md:col-span-1"
            />
        </div>
      </div>

      {isLoading && <div className="my-4"><Spinner /></div>}

      <div className="bg-white shadow overflow-x-auto rounded-lg">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Phone</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Source</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Assigned To</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Last Updated</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {filteredLeads.length === 0 && !isLoading && !isDataLoading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-secondary-500">No leads found.</td></tr>
            ) : (
                filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{lead.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{lead.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{lead.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColorClasses(lead.status)}`}>
                        {lead.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{lead.source}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{lead.assignedToName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(lead.updatedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenModal(lead, true)} aria-label={`View ${lead.name}`} disabled={isLoading}>
                        <EyeIcon className="h-4 w-4" />
                    </Button>
                    {(hasRole([Role.ADMIN, Role.MANAGER]) || (hasRole(Role.SALES_EXECUTIVE) && lead.assignedToId === user?.id)) &&
                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(lead)} aria-label={`Edit ${lead.name}`} disabled={isLoading}>
                        <EditIcon className="h-4 w-4" />
                        </Button>
                    }
                    {hasRole([Role.ADMIN, Role.MANAGER]) &&
                        <Button variant="danger" size="sm" onClick={() => handleDeleteLead(lead.id)} aria-label={`Delete ${lead.name}`} disabled={isLoading}>
                        <DeleteIcon className="h-4 w-4" />
                        </Button>
                    }
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <LeadModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          leadToEdit={editingLead}
          onSave={handleSaveLead}
          viewMode={isViewMode}
        />
      )}
    </div>
  );
};
