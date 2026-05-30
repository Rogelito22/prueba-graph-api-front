// src/App.jsx
import { useState, useEffect } from 'react';
import { nodeService } from './services/api';

function App() {
  // Estados de control del árbol y navegación
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  /**
   * Carga los nodos basándose en la posición actual del árbol.
   */
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
      // Manejo del 404: si un nodo no tiene hijos, limpiamos la lista de forma segura
      if (err.response && err.response.status === 404 && parentId !== null) {
        setNodes([]);
      } else {
        console.error("Error al cargar los nodos:", err);
        setError("Error de comunicación con el servidor. Intente nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial al montar la aplicación
  useEffect(() => {
    loadNodes(null);
  }, []);

  /**
   * Navegación hacia un nodo hijo (Hacer clic en una carpeta)
   */
  const handleNodeClick = async (clickedNode) => {
    setLoading(true);
    setError(null);
    try {
      const children = await nodeService.getChildNodes(clickedNode.id);
      setNodes(children);
      setHistory((prevHistory) => [...prevHistory, clickedNode]);
    } catch (err) {
      // Si el hijo es un nodo hoja (da 404), entramos igual pero mostrando lista vacía
      if (err.response && err.response.status === 404) {
        setNodes([]); 
        setHistory((prevHistory) => [...prevHistory, clickedNode]); 
      } else {
        console.error("Error al navegar:", err);
        setError("No se pudo abrir el elemento seleccionado.");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Retroceder un nivel en la navegación (Breadcrumbs)
   */
  const handleBackClick = async () => {
    if (history.length === 0) return;

    const newHistory = [...history];
    newHistory.pop(); 
    setHistory(newHistory);

    const targetParentId = newHistory.length > 0 ? newHistory[newHistory.length - 1].id : null;
    await loadNodes(targetParentId);
  };

  /**
   * Operación de Creación de Nodos
   */
  const handleCreateNode = async () => {
    const title = prompt("Introduce el título para el nuevo nodo:");
    if (!title || !title.trim()) return;

    const activeParentId = history.length > 0 ? history[history.length - 1].id : null;

    setLoading(true);
    try {
      await nodeService.createNode({
        parent: activeParentId,
        title: title.trim()
      });
      
      await loadNodes(activeParentId);
    } catch (err) {
      console.error("Error al crear nodo:", err);
      setError("No se pudo registrar el nuevo nodo.");
      setLoading(false);
    }
  };

  /**
   * Operación Segura de Eliminación de Nodos Vacíos
   */
  const handleDeleteNode = async () => {
    if (history.length === 0) return;

    const nodeToDelete = history[history.length - 1];

    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${nodeToDelete.title}"?`)) {
      setLoading(true);
      setError(null);
      try {
        await nodeService.deleteNode(nodeToDelete.id);
        
        const newHistory = [...history];
        newHistory.pop(); 
        setHistory(newHistory);

        const nextParentId = newHistory.length > 0 ? newHistory[newHistory.length - 1].id : null;
        await loadNodes(nextParentId);
      } catch (err) {
        console.error("Error al eliminar nodo:", err);
        setError("No se pudo eliminar. El nodo podría contener dependencias.");
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto', color: '#f5f5f5', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      
      {/* Sección Superior */}
      <div style={{ borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', letterSpacing: '-0.5px' }}>📁 Explorador de Estructura Jerárquica</h1>
      </div>

      {/* Navegación Contextual (Breadcrumbs) y Controles CRUD */}
      <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {history.length > 0 && (
            <button 
              onClick={handleBackClick}
              style={{ padding: '6px 14px', cursor: 'pointer', backgroundColor: '#333', color: 'white', border: '1px solid #444', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}
            >
              ← Volver
            </button>
          )}
          <span style={{ fontSize: '14px', color: '#aaa' }}>
            Ubicación: <strong style={{ color: '#fff' }}>Raíz</strong>{history.map(n => ` › ${n.title}`)}
          </span>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleCreateNode}
            style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}
          >
            ➕ Crear Subnodo
          </button>
          
          {history.length > 0 && (
            <button 
              onClick={handleDeleteNode}
              disabled={nodes.length > 0}
              style={{ 
                padding: '8px 16px', 
                cursor: nodes.length > 0 ? 'not-allowed' : 'pointer', 
                backgroundColor: nodes.length > 0 ? '#3b3b3b' : '#b91c1c', 
                color: nodes.length > 0 ? '#777' : 'white', 
                border: 'none', 
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              title={nodes.length > 0 ? "No puedes eliminar un nodo que contiene hijos" : "Eliminar elemento actual"}
            >
              🗑️ Eliminar Nodo Actual
            </button>
          )}
        </div>
      </div>

      {/* Contenedor Principal de la Lista */}
      <div style={{ minHeight: '150px', position: 'relative' }}>
        {loading && <p style={{ color: '#aaa', fontStyle: 'italic' }}>Sincronizando con el servidor...</p>}
        {error && <p style={{ color: '#ef4444', backgroundColor: '#451a1a', padding: '10px', borderRadius: '6px', fontSize: '14px', border: '1px solid #7f1d1d' }}>{error}</p>}

        {!loading && !error && (
          <div>
            {nodes.length === 0 ? (
              <div style={{ color: '#888', fontStyle: 'italic', padding: '30px 20px', textAlign: 'center', border: '1px dashed #333', borderRadius: '8px', backgroundColor: '#1e1e1e' }}>
                Este nodo no contiene subnodos actualmente.
              </div>
            ) : (
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                {nodes.map((node) => (
                  <li key={node.id} style={{ margin: '8px 0' }}>
                    <button 
                      onClick={() => handleNodeClick(node)}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: 'pointer', 
                        width: '100%', 
                        textAlign: 'left',
                        backgroundColor: '#222',
                        color: '#f3f4f6',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#222'}
                    >
                      <span style={{ color: '#eab308' }}>📁</span> 
                      <span style={{ flexGrow: 1 }}>{node.title}</span>
                      <span style={{ color: '#555', fontSize: '12px' }}>ID: {node.id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;