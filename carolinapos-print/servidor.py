"""
CarolinaPOS Print Server v1.3
Ejecutar con: Iniciar.bat
"""
import sys, os, logging

# ── Log a archivo ─────────────────────────────────────────────────────────────
LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'servidor.log')

logging.basicConfig(
    filename=LOG_PATH,
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    encoding='utf-8',
)

def log(msg):
    logging.info(msg)
    print(msg)

def log_error(msg):
    logging.error(msg)
    print(msg)

log('=== CarolinaPOS Print Server v1.3 iniciando ===')

# ── Verificar dependencias ────────────────────────────────────────────────────
try:
    from flask import Flask, request, jsonify
    log('Flask OK')
except ImportError as e:
    log_error(f'ERROR: Flask no instalado: {e}')
    log_error('Usa Iniciar.bat para arrancar el servidor, no servidor.py directamente.')
    input('Presiona Enter para salir...')
    sys.exit(1)

try:
    import win32print
    log('pywin32 OK')
except ImportError as e:
    log_error(f'ERROR: pywin32 no instalado: {e}')
    log_error('Cierra esta ventana y abre Iniciar.bat de nuevo.')
    input('Presiona Enter para salir...')
    sys.exit(1)

# ── Servidor ──────────────────────────────────────────────────────────────────
app = Flask(__name__)

ALLOWED_ORIGINS = [
    'https://app.carolinapos.co',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
]

def cors_headers(response, origin=''):
    if origin in ALLOWED_ORIGINS or not origin:
        response.headers['Access-Control-Allow-Origin'] = origin or '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Private-Network'] = 'true'
    return response

@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        from flask import make_response
        res = make_response('', 200)
        return cors_headers(res, request.headers.get('Origin', ''))

@app.after_request
def add_cors(response):
    return cors_headers(response, request.headers.get('Origin', ''))

@app.route('/health')
def health():
    default = ''
    try:
        default = win32print.GetDefaultPrinter()
    except Exception as e:
        logging.warning(f'GetDefaultPrinter: {e}')
    return jsonify({'ok': True, 'version': '1.3', 'default': default})

@app.route('/printers')
def listar_printers():
    try:
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        printers = [p[2] for p in win32print.EnumPrinters(flags)]
        return jsonify({'impresoras': printers})
    except Exception as e:
        logging.error(f'listar_printers: {e}')
        return jsonify({'impresoras': [], 'error': str(e)})

@app.route('/print', methods=['POST'])
def imprimir():
    try:
        data = request.get_json()
        raw_bytes = bytes(data['bytes'])
        nombre = data.get('impresora') or win32print.GetDefaultPrinter()
        logging.info(f'Imprimiendo en: {nombre} ({len(raw_bytes)} bytes)')

        h = win32print.OpenPrinter(nombre)
        try:
            win32print.StartDocPrinter(h, 1, ('Ticket CarolinaPOS', None, 'RAW'))
            try:
                win32print.StartPagePrinter(h)
                win32print.WritePrinter(h, raw_bytes)
                win32print.EndPagePrinter(h)
            finally:
                win32print.EndDocPrinter(h)
        finally:
            win32print.ClosePrinter(h)

        log(f'Ticket impreso OK en {nombre}')
        return jsonify({'ok': True})
    except Exception as e:
        log_error(f'Error al imprimir: {e}')
        return jsonify({'ok': False, 'error': str(e)}), 500

if __name__ == '__main__':
    log('Servidor escuchando en http://localhost:8765')
    try:
        app.run(host='127.0.0.1', port=8765, debug=False, use_reloader=False)
    except Exception as e:
        log_error(f'Error al iniciar servidor: {e}')
        raise
