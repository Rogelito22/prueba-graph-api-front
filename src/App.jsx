import { useState, useEffect } from 'react';
import { nodeService } from './services/api';

function App() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Historial de navegación para simular las carpetas/árbol
  // Guardaremos objetos: { id: 1, title: 'one' }
  const [history, setHistory] = useState([]);

  // Función reutilizable para cargar nodos según dónde estemos parados
 const loadNodes = async (parentId = null) => {
  setLoading(true);
  setError(null);
  try {
    let data;
    if (parentId === null) {
      data = await nodeService.getParentNodes();
    } else {
      data = await nodeService.getChildNodes(parentId);
    }
    setNodes(data);
  } catch (err) {
    // Si la API da 404 al recargar un nodo padre, significa que ese padre se quedó sin hijos
    if (err.response && err.response.status === 404 && parentId !== null) {
      setNodes([]); // Vaciamos la lista elegantemente sin romper la interfaz
    } else {
      // Cualquier otro error real (caída de servidor, internet, etc.) sí muestra el error
      console.error("Error cargando nodos:", err);
      setError("No se pudieron cargar los nodos.");
    }
  } finally {
    setLoading(false);
  }
};

  // Carga inicial (Raíz)
  useEffect(() => {
    loadNodes();
  }, []);

  // Acción al hacer click en un nodo (Entrar a sus hijos)
  const handleNodeClick = async (clickedNode) => {
  setLoading(true);
  setError(null);
  try {
    const children = await nodeService.getChildNodes(clickedNode.id);
    setNodes(children);
    setHistory([...history, clickedNode]);
  } catch (err) {
    // Si la API responde con 404, significa que el nodo simplemente NO tiene hijos.
    if (err.response && err.response.status === 404) {
      setNodes([]); // Dejamos la lista vacía para que muestre "Este nodo no tiene hijos"
      setHistory([...history, clickedNode]); // Igual permitimos entrar para ver las opciones
    } else {
      // Cualquier otro error (ej: 500, problemas de internet) sí es un fallo real.
      console.error("Error al navegar al nodo hijo:", err);
      setError("Error al abrir el nodo. Intenta de nuevo.");
    }
  } finally {
    setLoading(false);
  }
};

  // Acción para Volver Atrás
  const handleBackClick = () => {
    if (history.length === 0) return;

    // 1. Clonamos el historial y removemos el último elemento (donde estamos parados)
    const newHistory = [...history];
    newHistory.pop(); 
    
    // 2. Actualizamos el estado del historial
    setHistory(newHistory);

    // 3. Si el nuevo historial queda vacío, volvemos a la raíz (null)
    if (newHistory.length === 0) {
      loadNodes(null);
    } else {
      // Si aún quedan elementos, cargamos los hijos del último nodo del historial
      const previousNode = newHistory[newHistory.length - 1];
      loadNodes(previousNode.id);
    }
  };

  // Obtener el nodo actual donde estamos parados (si hay historial)
  const currentNode = history.length > 0 ? history[history.length - 1] : null;

  // Función para crear un nodo en la ubicación actual
const handleCreateNode = async () => {
  const title = prompt("Introduce el título para el nuevo nodo:");
  if (!title || !title.trim()) return;

  // Si history está vacío, el padre es null (Raíz). Si no, el padre es el ID del último nodo visitado.
  const parentId = history.length > 0 ? history[history.length - 1].id : null;

  setLoading(true);
  try {
    // El payload que descubrimos en el archivo Insomnia:
    await nodeService.createNode({
      parent: parentId,
      title: title, // Mandamos el título ingresado
      locales: ["es_ES"] // Configuración por defecto requerida por la API
    });
    
    // Refrescamos la vista actual para ver el nodo creado
    loadNodes(parentId);
  } catch (err) {
    console.error("Error al crear nodo:", err);
    setError("No se pudo crear el nodo.");
    setLoading(false);
  }
};

// Función para eliminar el nodo actual
// Función para eliminar el nodo actual de forma segura
const handleDeleteNode = async () => {
  if (history.length === 0) return;

  const nodeToDelete = history[history.length - 1];

  if (window.confirm(`¿Estás seguro de que deseas eliminar el nodo "${nodeToDelete.title}"?`)) {
    setLoading(true);
    setError(null);
    try {
      // 1. Borramos en la API
      await nodeService.deleteNode(nodeToDelete.id);
      
      // 2. Seteamos el nuevo historial PRIMERO para actualizar la ruta visual
      const newHistory = [...history];
      newHistory.pop(); 
      setHistory(newHistory);

      // 3. Mandamos a cargar al nuevo contenedor
      if (newHistory.length === 0) {
        await loadNodes(null);
      } else {
        const parentNode = newHistory[newHistory.length - 1];
        await loadNodes(parentNode.id);
      }
    } catch (err) {
      console.error("Error al eliminar el nodo:", err);
      setError("No se pudo eliminar el nodo.");
      setLoading(false);
    }
  }
};
 return (
  <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
    <h1>Explorador de Nodos</h1>

    {/* Barra de Navegación / Breadcrumbs */}
    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {history.length > 0 && (
          <button 
            onClick={handleBackClick}
            style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: '#e0e0e0', border: 'none', borderRadius: '4px', color: '#000' }}
          >
            ← Volver
          </button>
        )}
        <span style={{ fontWeight: 'bold' }}>
          Ruta actual: Raíz {history.map(n => ` > ${n.title}`)}
        </span>
      </div>

      {/* Panel de Operaciones CRUD */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
        <button 
          onClick={handleCreateNode}
          style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          ➕ Crear Nodo Aquí
        </button>
        
        {/* REQUISITO: El botón de eliminar solo se habilita si estamos dentro de un nodo y la lista de hijos actuales está vacía (nodes.length === 0) */}
        {history.length > 0 && (
          <button 
            onClick={handleDeleteNode}
            disabled={nodes.length > 0}
            style={{ 
              padding: '8px 12px', 
              cursor: nodes.length > 0 ? 'not-allowed' : 'pointer', 
              backgroundColor: nodes.length > 0 ? '#6c757d' : '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              opacity: nodes.length > 0 ? 0.5 : 1
            }}
            title={nodes.length > 0 ? "No puedes eliminar un nodo que contiene hijos" : "Eliminar este nodo"}
          >
            🗑️ Eliminar Nodo Actual
          </button>
        )}
      </div>
    </div>

    {/* Gestión de Estados */}
    {loading && <p>Cargando...</p>}
    {error && <p style={{ color: 'red' }}>{error}</p>}

    {/* Lista de Nodos */}
    {!loading && !error && (
      <div>
        {nodes.length === 0 ? (
          <p style={{ color: '#888', fontStyle: 'italic', padding: '20px', textAlign: 'center', border: '1px dashed #444', borderRadius: '6px' }}>
            Este nodo no tiene hijos.
          </p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {nodes.map((node) => (
              <li key={node.id} style={{ margin: '10px 0' }}>
                <button 
                  onClick={() => handleNodeClick(node)}
                  style={{ 
                    padding: '10px 15px', 
                    cursor: 'pointer', 
                    width: '100%', 
                    textAlign: 'left',
                    backgroundColor: '#242424',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: '6px'
                  }}
                >
                  📁 {node.title} (ID: {node.id})
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
  </div>
);
}

export default App;