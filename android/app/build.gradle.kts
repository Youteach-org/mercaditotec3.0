plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Release credentials must come from the developer's local environment or
// protected GitHub Actions secrets, never from this public repository.
val releaseKeystorePath = providers.environmentVariable("MERCADITOTEC_RELEASE_KEYSTORE").orNull
val releaseKeystorePassword = providers.environmentVariable("MERCADITOTEC_RELEASE_STORE_PASSWORD").orNull
val releaseKeyAlias = providers.environmentVariable("MERCADITOTEC_RELEASE_KEY_ALIAS").orNull
val releaseKeyPassword = providers.environmentVariable("MERCADITOTEC_RELEASE_KEY_PASSWORD").orNull
val hasReleaseCredentials = listOf(
    releaseKeystorePath, releaseKeystorePassword, releaseKeyAlias, releaseKeyPassword,
).all { !it.isNullOrBlank() }

android {
    namespace = "com.mercaditotec.android"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.mercaditotec.android"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "0.2.0"
    }

    signingConfigs {
        create("mercaditoRelease") {
            if (hasReleaseCredentials) {
                storeFile = file(releaseKeystorePath!!)
                storePassword = releaseKeystorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        getByName("release") {
            isDebuggable = false
            signingConfig = signingConfigs.getByName("mercaditoRelease")
        }
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// Deliberately fail closed instead of producing an unsigned APK for users.
tasks.register("validateReleaseSigning") {
    doLast {
        check(hasReleaseCredentials) {
            "Missing MercaditoTec release signing environment variables. See android/RELEASE_SECURITY_CHECKLIST.md"
        }
        check(file(releaseKeystorePath!!).isFile) {
            "MercaditoTec release signing keystore does not exist at the configured path."
        }
    }
}
tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    dependsOn("validateReleaseSigning")
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.04.01"))
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.ui:ui")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
}
