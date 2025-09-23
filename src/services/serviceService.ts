import { supabase } from '../integrations/supabase/client';
import { Service } from '../models/types';

export const fetchServices = async (): Promise<Service[]> => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return data?.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description || '',
      price: service.price,
      active: service.active ?? true,
      quantity: 1 // Services don't have quantity in DB, default to 1
    })) || [];
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
};

export const addServiceToDb = async (service: Omit<Service, 'id'>): Promise<Service> => {
  try {
    const { data, error } = await supabase
      .from('services')
      .insert({
        name: service.name,
        description: service.description,
        price: service.price,
        active: service.active ?? true
        // Note: quantity is not stored in DB for services, it's a frontend concept
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      price: data.price,
      active: data.active ?? true,
      quantity: 1 // Default quantity for services
    };
  } catch (error) {
    console.error('Error adding service:', error);
    throw error;
  }
};

export const updateServiceInDb = async (id: string, updates: Partial<Service>): Promise<void> => {
  try {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.active !== undefined) updateData.active = updates.active;
    // Note: quantity is not stored in DB for services, skip it

    const { error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating service:', error);
    throw error;
  }
};

export const deleteServiceFromDb = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
};