"""
Cliente de Supabase para la base de datos
"""

from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración de Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "your-anon-key")

# Crear cliente
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)