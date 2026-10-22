package com.mercaditotec.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.PasswordVisualTransformation
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

private val Navy = Color(0xFF123B83)
private val Orange = Color(0xFFF47B3F)
private val Cream = Color(0xFFFFF9EE)
private val Ink = Color(0xFF203450)
private val pale = Color(0xFFFFECD9)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = lightColorScheme(
                    primary = Navy,
                    secondary = Orange,
                    background = Cream,
                    surface = Color.White,
                    onPrimary = Color.White,
                    onSurface = Ink,
                ),
            ) {
                MercaditoNativeApp()
            }
        }
    }
}

@Composable
private fun MercaditoNativeApp() {
    var session by remember { mutableStateOf<NativeApi.Session?>(null) }
    var catalogue by remember { mutableStateOf<NativeApi.Catalogue?>(null) }
    var selected by remember { mutableStateOf<NativeApi.Store?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var query by rememberSaveable { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    fun refresh() {
        val current = session ?: return
        scope.launch {
            loading = true
            error = null
            try {
                catalogue = NativeApi.catalogue(current)
            } catch (e: Exception) {
                error = e.message ?: "No se pudieron cargar las tiendas."
            } finally {
                loading = false
            }
        }
    }

    BackHandler(enabled = selected != null) { selected = null }

    Surface(modifier = Modifier.fillMaxSize(), color = Cream) {
        Column {
            BrandHeader(
                signedIn = session != null,
                onLogout = {
                    // Tokens are deliberately held in memory only.
                    session = null
                    catalogue = null
                    selected = null
                    error = null
                },
            )
            if (session == null) {
                LoginScreen(
                    loading = loading,
                    error = error,
                    onLogin = { user, password ->
                        scope.launch {
                            loading = true
                            error = null
                            try {
                                session = NativeApi.login(user, password)
                                catalogue = NativeApi.catalogue(session!!)
                            } catch (e: Exception) {
                                // Clear a partially accepted login if account
                                // sync / eligibility or the catalogue fails.
                                if (session == null) {
                                    error = e.message ?: "No fue posible acceder a MercaditoTec."
                                } else {
                                    error = e.message ?: "No se pudieron cargar las tiendas."
                                }
                            } finally {
                                loading = false
                            }
                        }
                    },
                )
            } else if (selected != null) {
                ShopDetail(store = selected!!, onBack = { selected = null })
            } else {
                CatalogueScreen(
                    catalogue = catalogue,
                    loading = loading,
                    error = error,
                    query = query,
                    onQueryChange = { query = it },
                    onRetry = ::refresh,
                    onOpen = { selected = it },
                )
            }
        }
    }
}

@Composable
private fun BrandHeader(signedIn: Boolean, onLogout: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Navy)
            .padding(horizontal = 20.dp, vertical = 15.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column {
            Text("MercaditoTec", fontSize = 26.sp, fontWeight = FontWeight.Black, color = Color.White)
            Text(
                "DE ESTUDIANTES · PARA ESTUDIANTES",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFFFD28B),
            )
        }
        if (signedIn) {
            TextButton(onClick = onLogout) { Text("Salir", color = Color.White) }
        }
    }
}

@Composable
private fun LoginScreen(
    loading: Boolean,
    error: String?,
    onLogin: (String, String) -> Unit,
) {
    var user by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(28.dp))
        Box(
            modifier = Modifier
                .background(pale, RoundedCornerShape(28.dp))
                .padding(28.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text("🏪", fontSize = 54.sp)
        }
        Spacer(Modifier.height(20.dp))
        Text("Bienvenido al Mercadito", color = Navy, fontSize = 25.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(8.dp))
        Text(
            "La aplicación nativa de nuestra comunidad. Entra con tu cuenta institucional de siempre.",
            color = Ink,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(30.dp))
        OutlinedTextField(
            value = user,
            onValueChange = { user = it },
            label = { Text("Usuario institucional") },
            supportingText = { Text("Se agrega @morelia.tecnm.mx automáticamente") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Contraseña") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth(),
        )
        if (error != null) {
            Spacer(Modifier.height(12.dp))
            Text(error, color = Color(0xFFB3261E), textAlign = TextAlign.Center)
        }
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = { onLogin(user, password) },
            enabled = !loading && user.isNotBlank() && password.isNotBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = Navy),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            if (loading) CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
            else Text("Entrar a MercaditoTec", fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(14.dp))
        Text(
            "La elegibilidad se comprueba en el servidor. No se crean cuentas nuevas desde esta primera versión.",
            fontSize = 12.sp, color = Ink, textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun CatalogueScreen(
    catalogue: NativeApi.Catalogue?,
    loading: Boolean,
    error: String?,
    query: String,
    onQueryChange: (String) -> Unit,
    onRetry: () -> Unit,
    onOpen: (NativeApi.Store) -> Unit,
) {
    val filtered = remember(catalogue, query) {
        val clean = query.trim()
        catalogue?.stores?.filter { store ->
            clean.isBlank() ||
                store.name.contains(clean, ignoreCase = true) ||
                store.description.contains(clean, ignoreCase = true) ||
                store.categoryTags.any { it.contains(clean, ignoreCase = true) }
        }.orEmpty()
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Spacer(Modifier.height(20.dp))
        Text("Tiendas de la comunidad", color = Navy, fontSize = 24.sp, fontWeight = FontWeight.Black)
        if (catalogue != null) {
            Text(
                "${catalogue.realStoreCount} tiendas reales · ${catalogue.stores.count { it.demo }} de muestra",
                color = Ink, fontSize = 13.sp,
            )
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            placeholder = { Text("Buscar tienda, producto o categoría") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))

        if (loading) {
            Box(Modifier.fillMaxWidth().padding(26.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        if (error != null) {
            Text(error, color = Color(0xFFB3261E))
            OutlinedButton(onClick = onRetry) { Text("Reintentar") }
        }
        if (!loading && catalogue == null && error == null) {
            OutlinedButton(onClick = onRetry) { Text("Cargar tiendas") }
        }
        if (!loading && catalogue != null) {
            if (filtered.isEmpty()) {
                Text("No se encontraron tiendas.", modifier = Modifier.padding(16.dp))
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(filtered, key = { it.id }) { store ->
                        ShopCard(store, onClick = { onOpen(store) })
                    }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }
}

@Composable
private fun ShopCard(store: NativeApi.Store, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(19.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (store.demo) "TIENDA DE MUESTRA" else if (store.openNow) "ABIERTO" else "TIENDA",
                    color = if (store.demo) Color(0xFF9A4C13) else Navy,
                    fontSize = 11.sp, fontWeight = FontWeight.Black,
                )
                Spacer(Modifier.width(12.dp))
                Text(store.marketplaceLabel, color = Orange, fontSize = 12.sp)
            }
            Spacer(Modifier.height(7.dp))
            Text(store.name, fontWeight = FontWeight.Black, fontSize = 21.sp, color = Navy)
            if (store.description.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(store.description, maxLines = 3, color = Ink)
            }
            Spacer(Modifier.height(9.dp))
            Text("📍 ${store.deliveryLocation}", color = Ink, fontSize = 13.sp)
            if (store.categoryTags.isNotEmpty()) {
                Spacer(Modifier.height(7.dp))
                Text(store.categoryTags.joinToString(" · "), color = Orange, fontSize = 13.sp)
            }
            Spacer(Modifier.height(8.dp))
            Text("Ver detalles →", color = Navy, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun ShopDetail(store: NativeApi.Store, onBack: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
    ) {
        TextButton(onClick = onBack) { Text("← Volver a tiendas") }
        Spacer(Modifier.height(15.dp))
        Text(store.name, fontSize = 29.sp, fontWeight = FontWeight.Black, color = Navy)
        if (store.demo) {
            Spacer(Modifier.height(8.dp))
            Text(
                "Tienda de muestra: no recibe pedidos y no representa un negocio real.",
                color = Color(0xFF9A4C13), fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(store.description, fontSize = 17.sp, color = Ink)
        Spacer(Modifier.height(18.dp))
        HorizontalDivider(color = Orange)
        Spacer(Modifier.height(18.dp))
        Text("Lugar de entrega", fontSize = 15.sp, color = Navy, fontWeight = FontWeight.Bold)
        Text(store.deliveryLocation.ifBlank { "No especificado" }, color = Ink)
        Spacer(Modifier.height(18.dp))
        Text("Categorías", fontSize = 15.sp, color = Navy, fontWeight = FontWeight.Bold)
        Text(store.categoryTags.joinToString(" · ").ifBlank { "No especificadas" }, color = Ink)
        Spacer(Modifier.height(18.dp))
        Text(
            "Los productos, pedidos y contacto de esta tienda se incorporarán en los módulos nativos siguientes.",
            color = Ink, fontSize = 13.sp,
        )
    }
}
