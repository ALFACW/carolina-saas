"""
CarolinaPOS Print Server v1.0
Servidor local de impresion ESC/POS para impresoras termicas USB.
Corre en http://localhost:8765
"""
from flask import Flask, request, jsonify
import win32print
import sys
import os

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
    except:
        pass
    return jsonify({'ok': True, 'version': '1.0', 'default': default})

@app.route('/printers')
def listar_printers():
    try:
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        printers = [p[2] for p in win32print.EnumPrinters(flags)]
        return jsonify({'impresoras': printers})
    except Exception as e:
        return jsonify({'impresoras': [], 'error': str(e)})

@app.route('/print', methods=['POST'])
def imprimir():
    try:
        data = request.get_json()
        raw_bytes = bytes(data['bytes'])
        nombre = data.get('impresora') or win32print.GetDefaultPrinter()

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

        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print('CarolinaPOS Print Server corriendo en http://localhost:8765')
    print('Presiona Ctrl+C para detener.')
    app.run(host='127.0.0.1', port=8765, debug=False, use_reloader=False)
