
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "../services/supabaseClient";
import { productSeedData } from "../services/seedData";
import { seedProducts } from "../services/supabaseClient";

const Index = () => {
  const navigate = useNavigate();
  
  // Check connection and if products table exists
  const checkDatabaseSetup = async () => {
    try {
      const { data: healthCheck, error: healthCheckError } = await supabase.rpc('pg_health_check');
      
      if (healthCheckError) {
        console.error("Database connection error:", healthCheckError);
        navigate('/');
        return;
      }
      
      const { data, error } = await supabase
        .from('products')
        .select('count(*)', { count: 'exact', head: true });
        
      if (error) {
        // Table likely doesn't exist yet - go to the main page
        console.error("Error checking products table:", error);
        navigate('/');
        return;
      }
      
      // If we have a connection and the table exists, proceed to main app
      navigate('/');
    } catch (err) {
      console.error("Database setup check error:", err);
      navigate('/');
    }
  };
  
  useEffect(() => {
    checkDatabaseSetup();
  }, [navigate]);
  
  return null;
};

export default Index;
