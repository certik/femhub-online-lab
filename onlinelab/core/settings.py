"""Configuration options for Online Lab core. """

options = [
    ('port', 'int'),
    ('debug', 'bool'),
    ('daemon', 'bool'),
    ('pid_file', 'path'),
    ('log_file', 'path'),
    ('log_level', 'str'),
    ('log_max_size', 'int'),
    ('log_num_backups', 'int'),
    ('data_path', 'path'),
    ('static_path', 'path'),
    ('templates_path', 'path'),
]

defaults = {
    'port': 8000,
    'debug': False,
    'daemon': True,
    'pid_file': "%(home)s/onlinelab-core-%(port)s.pid",
    'log_file': "%(home)s/logs/onlinelab-core-%(port)s.log",
    'log_level': 'info',
    'log_max_size': 10*1000*1000,      # store 10 MB in a log file
    'log_num_backups': 10,             # keep 10 log files at most
    'data_path': '%(home)s/data',
    'static_path': '%(home)s/static',
    'templates_path': '%(home)s/templates',
}

