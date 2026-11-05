// Arranque del cliente: se cargan todas las features (registran sus vistas, acciones y listeners),
// luego se cargan los datos y se pinta.
import '../features/contacts/schema.js';
import '../features/contacts/store.js';
import '../features/contacts/views/list.js';
import '../features/contacts/views/detail.js';
import '../features/contacts/views/modal.js';
import '../features/contacts/actions.js';
import '../shared/schema.js';
import '../shared/ui/links.js';
import { iniciar } from '../legacy.js';

iniciar();
