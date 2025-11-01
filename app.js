const { createClient } = supabase;

// Configuración de Supabase
const supabaseUrl = 'https://meujejelranonalinbxp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldWplamVscmFub25hbGluYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDE1ODAsImV4cCI6MjA3NzU3NzU4MH0.22xNTrbFT1ncq3YYhfasuPhDqm0w1Sam2a44pCq-Ij4';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const { useState, useEffect } = React;
const { Download, Plus, Trash2, TrendingUp, Activity, Target, Save, AlertTriangle, CheckCircle, XCircle, Info, Zap, Moon, Sun } = lucide;

function RunningTracker() {
  const [sessions, setSessions] = useState([]);
  const [view, setView] = useState('registro');
  const [fcMax, setFcMax] = useState(190);
  const [fcReposo, setFcReposo] = useState(60);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('sessions')
        .select('*')
        .order('fecha', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setSessions(data.map(s => ({
          ...s,
          id: s.id,
          z1: s.z1 || '',
          z2: s.z2 || '',
          z3: s.z3 || '',
          z4: s.z4 || '',
          z5: s.z5 || ''
        })));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSession = async (sessionData) => {
    try {
      const { data, error } = await supabaseClient
        .from('sessions')
        .insert([sessionData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error guardando sesión:', error);
      alert('❌ Error al guardar la sesión');
      return null;
    }
  };

  const deleteSessionDB = async (id) => {
    try {
      const { error } = await supabaseClient
        .from('sessions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando sesión:', error);
      return false;
    }
  };

  const [newSession, setNewSession] = useState({
    fecha: '',
    semana: 1,
    tipo: 'Intervalos',
    duracion: '',
    distancia: '',
    ritmo_promedio: '',
    ritmo_objetivo: '',
    fc_promedio: '',
    fc_maxima: '',
    z1: '', z2: '', z3: '', z4: '', z5: '',
    rpe: 5,
    fatiga: 5,
    sensacion_muscular: '',
    elevacion: '',
    tiempo_pendiente: '',
    variabilidad_ritmo: '',
    comentario_tecnico: '',
    condiciones: '',
    carga_trimp: '',
    estado_previo: 3,
    observaciones: ''
  });

  const calcularDesviacionRitmo = (promedio, objetivo) => {
    if (!promedio || !objetivo) return 0;
    return (((parseFloat(promedio) - parseFloat(objetivo)) / parseFloat(objetivo)) * 100).toFixed(2);
  };

  const calcularPorcentajeFCMax = (fcPromedio) => {
    if (!fcPromedio) return 0;
    return ((parseFloat(fcPromedio) / fcMax) * 100).toFixed(1);
  };

  const calcularTRIMP = (duracion, fcPromedio, fcMaxVal) => {
    if (!duracion || !fcPromedio) return 0;
    const ratio = parseFloat(fcPromedio) / fcMaxVal;
    return (parseFloat(duracion) * ratio * 0.64 * Math.exp(1.92 * ratio)).toFixed(1);
  };

  const calcularEficiencia = (distancia, duracion, fcPromedio) => {
    if (!distancia || !duracion || !fcPromedio) return 0;
    const velocidad = (parseFloat(distancia) / parseFloat(duracion)) * 60;
    return (velocidad / parseFloat(fcPromedio) * 1000).toFixed(2);
  };

  const generarAlertas = () => {
    const alertas = [];
    
    if (sessions.length < 3) {
      return [{
        tipo: 'info',
        titulo: 'Comenzando',
        mensaje: 'Registra al menos 3 sesiones para obtener análisis inteligentes',
        severidad: 'baja'
      }];
    }

    const ultimas7Sesiones = sessions.slice(0, 7);
    const ultimas3Sesiones = ultimas7Sesiones.slice(0, 3);
    
    const rpeAlto = ultimas3Sesiones.filter(s => s.rpe >= 8).length;
    if (rpeAlto >= 2) {
      alertas.push({
        tipo: 'peligro',
        titulo: '⚠️ RPE Consistentemente Alto',
        mensaje: `${rpeAlto} de tus últimas 3 sesiones tienen RPE ≥8. Riesgo de sobreentrenamiento.`,
        recomendacion: 'Considera tomar 1-2 días de descanso activo o reducir intensidad 20-30%',
        severidad: 'alta'
      });
    }

    const fatigaPromedio = ultimas3Sesiones.reduce((sum, s) => sum + s.fatiga, 0) / ultimas3Sesiones.length;
    if (fatigaPromedio >= 7.5) {
      alertas.push({
        tipo: 'advertencia',
        titulo: '🔴 Fatiga Acumulada Detectada',
        mensaje: `Fatiga promedio de ${fatigaPromedio.toFixed(1)}/10 en últimas 3 sesiones`,
        recomendacion: 'Prioriza sueño (8+ horas), nutrición y considera sesión de recuperación activa',
        severidad: 'media'
      });
    }

    if (ultimas7Sesiones.length >= 7) {
      const cargaAguda = ultimas7Sesiones.reduce((sum, s) => sum + (parseFloat(s.carga_trimp) || 0), 0) / 7;
      const ultimas28 = sessions.slice(0, 28);
      
      if (ultimas28.length >= 14) {
        const cargaCronica = ultimas28.reduce((sum, s) => sum + (parseFloat(s.carga_trimp) || 0), 0) / ultimas28.length;
        const acwr = cargaAguda / cargaCronica;
        
        if (acwr > 1.5) {
          alertas.push({
            tipo: 'peligro',
            titulo: '🚨 ACWR Elevado - Riesgo de Lesión',
            mensaje: `Tu ratio de carga aguda:crónica es ${acwr.toFixed(2)} (óptimo: 0.8-1.3)`,
            recomendacion: 'URGENTE: Reduce volumen o intensidad 30-40% esta semana para prevenir lesiones',
            severidad: 'alta'
          });
        }
      }
    }

    const sesiones5k = sessions.filter(s => s.distancia >= 4.5 && s.distancia <= 5.5 && s.ritmo_promedio);
    if (sesiones5k.length >= 2) {
      const mejorSesion = sesiones5k.reduce((mejor, s) => 
        parseFloat(s.ritmo_promedio) < parseFloat(mejor.ritmo_promedio) ? s : mejor
      );
      const tiempoEstimado = parseFloat(mejorSesion.ritmo_promedio) * 5;
      
      if (tiempoEstimado <= 20 && tiempoEstimado > 19) {
        alertas.push({
          tipo: 'exito',
          titulo: '🎯 ¡MUY CERCA DE SUB-20!',
          mensaje: `Estás a solo ${((tiempoEstimado - 20) * 60).toFixed(0)} segundos de tu objetivo`,
          recomendacion: 'Considera hacer test oficial de 5K en condiciones óptimas esta semana',
          severidad: 'positiva'
        });
      } else if (tiempoEstimado < 20) {
        alertas.push({
          tipo: 'exito',
          titulo: '🏆 ¡OBJETIVO SUB-20 ALCANZADO!',
          mensaje: `Tu mejor marca estimada: ${Math.floor(tiempoEstimado)}:${Math.round((tiempoEstimado % 1) * 60).toString().padStart(2, '0')}`,
          recomendacion: '¡Felicidades! Ahora busca consolidar y mejorar aún más',
          severidad: 'positiva'
        });
      }
    }

    return alertas.length > 0 ? alertas : [{
      tipo: 'exito',
      titulo: '✅ Todo en Orden',
      mensaje: 'No se detectaron alertas. Tu entrenamiento va por buen camino',
      recomendacion: 'Mantén la consistencia y escucha a tu cuerpo',
      severidad: 'positiva'
    }];
  };

  const alertas = generarAlertas();

  const addSession = async () => {
    if (!newSession.fecha || !newSession.duracion || !newSession.distancia) {
      alert('⚠️ Completa: Fecha, Duración y Distancia');
      return;
    }

    const sessionData = {
      fecha: newSession.fecha,
      semana: newSession.semana,
      tipo: newSession.tipo,
      duracion: parseFloat(newSession.duracion) || 0,
      distancia: parseFloat(newSession.distancia) || 0,
      ritmo_promedio: parseFloat(newSession.ritmo_promedio) || null,
      ritmo_objetivo: parseFloat(newSession.ritmo_objetivo) || null,
      fc_promedio: parseInt(newSession.fc_promedio) || null,
      fc_maxima: parseInt(newSession.fc_maxima) || null,
      z1: parseFloat(newSession.z1) || null,
      z2: parseFloat(newSession.z2) || null,
      z3: parseFloat(newSession.z3) || null,
      z4: parseFloat(newSession.z4) || null,
      z5: parseFloat(newSession.z5) || null,
      rpe: newSession.rpe,
      fatiga: newSession.fatiga,
      sensacion_muscular: newSession.sensacion_muscular,
      elevacion: parseFloat(newSession.elevacion) || null,
      tiempo_pendiente: parseFloat(newSession.tiempo_pendiente) || null,
      variabilidad_ritmo: parseFloat(newSession.variabilidad_ritmo) || null,
      comentario_tecnico: newSession.comentario_tecnico,
      condiciones: newSession.condiciones,
      carga_trimp: parseFloat(newSession.carga_trimp) || parseFloat(calcularTRIMP(newSession.duracion, newSession.fc_promedio, fcMax)),
      estado_previo: newSession.estado_previo,
      observaciones: newSession.observaciones,
      desviacion_ritmo: parseFloat(calcularDesviacionRitmo(newSession.ritmo_promedio, newSession.ritmo_objetivo)),
      porcentaje_fc_max: parseFloat(calcularPorcentajeFCMax(newSession.fc_promedio)),
      eficiencia: parseFloat(calcularEficiencia(newSession.distancia, newSession.duracion, newSession.fc_promedio))
    };

    const savedSession = await saveSession(sessionData);
    if (savedSession) {
      setSessions([savedSession, ...sessions]);
      alert('✅ Sesión guardada en la nube');
      setNewSession({
        fecha: '',
        semana: newSession.semana,
        tipo: 'Intervalos',
        duracion: '',
        distancia: '',
        ritmo_promedio: '',
        ritmo_objetivo: '',
        fc_promedio: '',
        fc_maxima: '',
        z1: '', z2: '', z3: '', z4: '', z5: '',
        rpe: 5,
        fatiga: 5,
        sensacion_muscular: '',
        elevacion: '',
        tiempo_pendiente: '',
        variabilidad_ritmo: '',
        comentario_tecnico: '',
        condiciones: '',
        carga_trimp: '',
        estado_previo: 3,
        observaciones: ''
      });
    }
  };

  const deleteSession = async (id) => {
    if (confirm('¿Eliminar sesión de la nube?')) {
      const success = await deleteSessionDB(id);
      if (success) {
        setSessions(sessions.filter(s => s.id !== id));
        alert('✅ Sesión eliminada');
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Fecha', 'Semana', 'Tipo', 'Duración', 'Distancia', 'Ritmo', 'FC', 'RPE', 'TRIMP'];
    const csvContent = [
      headers.join(','),
      ...sessions.map(s => [
        s.fecha, s.semana, s.tipo, s.duracion, s.distancia, 
        s.ritmo_promedio, s.fc_promedio, s.rpe, s.carga_trimp
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `5k_training_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return React.createElement('div', { className: 'min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center' },
      React.createElement(Activity, { className: 'w-16 h-16 text-blue-600 animate-pulse' })
    );
  }

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-blue-50';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-800';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';

  return React.createElement('div', { className: `min-h-screen ${bgColor} p-4` },
    React.createElement('div', { className: 'max-w-7xl mx-auto' },
      React.createElement('div', { className: `${cardBg} rounded-xl shadow-lg p-6 mb-6` },
        React.createElement('div', { className: 'flex items-center justify-between flex-wrap gap-4' },
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement(Target, { className: 'w-10 h-10 text-blue-600' }),
            React.createElement('div', null,
              React.createElement('h1', { className: `text-3xl font-bold ${textColor}` }, 'Sistema Pro Sub-20 5K'),
              React.createElement('p', { className: `text-sm ${textSecondary}` }, 'Mesociclo Hickson | 21:05 → 19:59')
            )
          ),
          React.createElement('div', { className: 'flex gap-2' },
            React.createElement('button', { 
              onClick: exportToCSV,
              className: 'flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition'
            },
              React.createElement(Download, { className: 'w-4 h-4' }),
              'CSV'
            )
          )
        )
      ),

      showAlerts && alertas.length > 0 && React.createElement('div', { className: `${cardBg} rounded-xl shadow-lg p-6 mb-6` },
        React.createElement('h2', { className: `text-2xl font-bold ${textColor} mb-4` }, '⚡ Alertas Inteligentes'),
        React.createElement('div', { className: 'space-y-3' },
          alertas.map((alerta, idx) =>
            React.createElement('div', {
              key: idx,
              className: `p-4 rounded-lg border-l-4 ${
                alerta.tipo === 'peligro' ? 'bg-red-50 border-red-500' :
                alerta.tipo === 'advertencia' ? 'bg-orange-50 border-orange-500' :
                alerta.tipo === 'exito' ? 'bg-green-50 border-green-500' :
                'bg-blue-50 border-blue-500'
              }`
            },
              React.createElement('h3', { className: 'font-bold text-lg mb-1' }, alerta.titulo),
              React.createElement('p', { className: 'text-sm mb-2' }, alerta.mensaje),
              alerta.recomendacion && React.createElement('p', { className: 'text-sm font-semibold bg-white/50 p-2 rounded' },
                '💡 ', alerta.recomendacion
              )
            )
          )
        )
      ),

      React.createElement('div', { className: `${cardBg} rounded-xl shadow-lg p-6` },
        React.createElement('h2', { className: `text-2xl font-bold mb-4 ${textColor}` }, '📝 Nueva Sesión'),
        
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-4' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-semibold mb-1' }, 'Fecha *'),
            React.createElement('input', {
              type: 'date',
              value: newSession.fecha,
              onChange: (e) => setNewSession({...newSession, fecha: e.target.value}),
              className: 'w-full border rounded-lg px-3 py-2'
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-semibold mb-1' }, 'Semana'),
            React.createElement('input', {
              type: 'number',
              value: newSession.semana,
              onChange: (e) => setNewSession({...newSession, semana: parseInt(e.target.value)}),
              className: 'w-full border rounded-lg px-3 py-2'
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-semibold mb-1' }, 'Duración (min) *'),
            React.createElement('input', {
              type: 'number',
              step: '0.1',
              value: newSession.duracion,
              onChange: (e) => setNewSession({...newSession, duracion: e.target.value}),
              className: 'w-full border rounded-lg px-3 py-2'
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-semibold mb-1' }, 'Distancia (km) *'),
            React.createElement('input', {
              type: 'number',
              step: '0.01',
              value: newSession.distancia,
              onChange: (e) => setNewSession({...newSession, distancia: e.target.value}),
              className: 'w-full border rounded-lg px-3 py-2'
            })
          )
        ),

        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-semibold mb-1' }, 'Ritmo (min/km)'),
            React.createElement('input', {
              type: 'number',
              step: '0.01',
              value: newSession.ritmo_promedio,
              onChange: (e) => setNewSession({...newSession, ritmo_promedio: e.target.value}),
              className: 'w-full border rounded-lg px-3 py-2'
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-semibold mb-1' }, 'FC Promedio'),
            React.createElement('input', {
              type: 'number',
              value: newSession.fc_promedio,
              onChange: (e) => setNewSession({...newSession, fc_promedio: e.target.value}),
              className: 'w-full border rounded-lg px-3 py-2'
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-xs font-semibold mb-1' }, 'RPE (1-10)'),
            React.createElement('input', {
              type: 'range',
              min: '1',
              max: '10',
              value: newSession.rpe,
              onChange: (e) => setNewSession({...newSession, rpe: parseInt(e.target.value)}),
              className: 'w-full'
            }),
            React.createElement('div', { className: 'text-center text-2xl font-bold text-blue-600' }, newSession.rpe)
          )
        ),

        React.createElement('button', {
          onClick: addSession,
          className: 'w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2'
        },
          React.createElement(Plus, { className: 'w-5 h-5' }),
          'Guardar en la Nube'
        )
      ),

      React.createElement('div', { className: `${cardBg} rounded-xl shadow-lg p-6 mt-6` },
        React.createElement('h2', { className: `text-2xl font-bold mb-4 ${textColor}` }, `Sesiones (${sessions.length})`),
        React.createElement('div', { className: 'space-y-3' },
          sessions.map(s =>
            React.createElement('div', { key: s.id, className: 'flex items-center justify-between border-b pb-3' },
              React.createElement('div', null,
                React.createElement('p', { className: 'font-bold' }, s.fecha),
                React.createElement('p', { className: 'text-sm text-gray-600' }, 
                  `${s.distancia}km • ${s.ritmo_promedio ? s.ritmo_promedio + ' min/km' : ''} • RPE: ${s.rpe}`
                )
              ),
              React.createElement('button', {
                onClick: () => deleteSession(s.id),
                className: 'text-red-600 hover:text-red-800'
              },
                React.createElement(Trash2, { className: 'w-5 h-5' })
              )
            )
          )
        )
      )
    )
  );
}

ReactDOM.render(React.createElement(RunningTracker), document.getElementById('root'));
         