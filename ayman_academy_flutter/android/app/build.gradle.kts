plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.aymanacademy.ayman_academy_app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.aymanacademy.ayman_academy_app"
        minSdk = 23
        targetSdk = 34
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        multiDexEnabled = true
    }

    signingConfigs {
        create("release") {
            // To publish to Play Store, create a keystore and set these properties
            // in android/key.properties (DO NOT commit key.properties to git):
            //   storeFile=path/to/your/keystore.jks
            //   storePassword=your_store_password
            //   keyAlias=your_key_alias
            //   keyPassword=your_key_password
            //
            // Then uncomment the lines below and comment out the debug fallback.
            //
            // val keystorePropertiesFile = rootProject.file("key.properties")
            // val keystoreProperties = java.util.Properties()
            // keystoreProperties.load(java.io.FileInputStream(keystorePropertiesFile))
            // storeFile = file(keystoreProperties["storeFile"] as String)
            // storePassword = keystoreProperties["storePassword"] as String
            // keyAlias = keystoreProperties["keyAlias"] as String
            // keyPassword = keystoreProperties["keyPassword"] as String
        }
    }

    buildTypes {
        release {
            // Using debug keys for now. Before Play Store submission,
            // configure the release signing config above and switch to:
            // signingConfig = signingConfigs.getByName("release")
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

flutter {
    source = "../.."
}
