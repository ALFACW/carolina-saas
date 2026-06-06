"""
CarolinaPOS Print Server v2.0
Ejecutar con: Iniciar.bat
"""
import sys, os, json, time, logging
import urllib.request, urllib.error

LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'servidor.log')
logging.basicConfig(
    filename=LOG_PATH, level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s', encoding='utf-8',
)

def log(msg):
    logging.info(msg)
    print(msg)

def log_error(msg):
    logging.error(msg)
    print('  ERROR:', msg)

log('=== CarolinaPOS Print Server v2.0 iniciando ===')

try:
    import win32print
    log('win32print OK')
except ImportError as e:
    log_error(f'pywin32 no instalado: {e}')
    log_error('Usa Iniciar.bat para arrancar el servidor.')
    input('Presiona Enter para salir...')
    sys.exit(1)

# ── Cargar configuración ──────────────────────────────────────────────────────

def load_config():
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')
    if not os.path.exists(config_path):
        log_error('Falta config.json')
        print()
        print('  Pasos para obtenerlo:')
        print('  1. Abre app.carolinapos.co en tu navegador')
        print('  2. Ve a Configuracion -> Impresora')
        print('  3. Haz clic en "Descargar config.json"')
        print('  4. Copia el archivo a esta misma carpeta')
        print('  5. Vuelve a abrir Iniciar.bat')
        print()
        input('Presiona Enter para salir...')
        sys.exit(1)
    with open(config_path, encoding='utf-8') as f:
        return json.load(f)

# ── Impresión ─────────────────────────────────────────────────────────────────

def get_printers():
    try:
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        return [p[2] for p in win32print.EnumPrinters(flags)]
    except Exception as e:
        logging.warning(f'get_printers: {e}')
        return []

def print_job(job):
    raw = bytes(job['bytes'])
    printer = job.get('impresora') or win32print.GetDefaultPrinter()
    h = win32print.OpenPrinter(printer)
    try:
        win32print.StartDocPrinter(h, 1, ('Ticket CarolinaPOS', None, 'RAW'))
        try:
            win32print.StartPagePrinter(h)
            win32print.WritePrinter(h, raw)
            win32print.EndPagePrinter(h)
        finally:
            win32print.EndDocPrinter(h)
    finally:
        win32print.ClosePrinter(h)

# ── API ───────────────────────────────────────────────────────────────────────

def api(url, method='GET', data=None):
    body = json.dumps(data).encode() if data is not None else None
    req  = urllib.request.Request(url, data=body, method=method)
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read())

# ── Loop principal ────────────────────────────────────────────────────────────

def run(config):
    base  = config['api'].rstrip('/')
    token = config['token']
    printers = get_printers()

    log(f'Conectado a {base}')
    log(f'Impresoras: {", ".join(printers) if printers else "(ninguna detectada)"}')
    log('Esperando trabajos de impresion...')

    beat_tick = 0

    while True:
        try:
            beat_tick += 1

            # Heartbeat cada 5 segundos
            if beat_tick >= 5:
                beat_tick = 0
                printers = get_printers()
                api(f'{base}/api/print/heartbeat/{token}', 'POST', {'printers': printers})

            # Obtener trabajos pendientes
            result = api(f'{base}/api/print/poll/{token}')
            for job in result.get('jobs', []):
                jid = job['id']
                try:
                    print_job(job)
                    log(f'Ticket impreso en "{job.get("impresora", "default")}"')
                except Exception as e:
                    log_error(f'Error al imprimir: {e}')
                finally:
                    try:
                        api(f'{base}/api/print/job/{token}/{jid}', 'DELETE')
                    except Exception:
                        pass

        except Exception as e:
            logging.warning(f'Error de conexion: {e}')

        time.sleep(1)

# ── Entrada ───────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    config = load_config()
    print()
    print('  +------------------------------------------+')
    print('  |  CarolinaPOS Print Server v2.0            |')
    print('  |  Conectado via cloud (sin CORS)           |')
    print('  |  Deja esta ventana abierta                |')
    print('  +------------------------------------------+')
    print()
    run(config)
