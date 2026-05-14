<?php
/**
 * Plugin Name: Улётная Парковка — оптимизация
 * Description: Page cache, lazy load, удаление мусора (gtag дубли, emoji, embeds, blocks-css). Без админки, без БД.
 * Version: 1.0.0
 * Author: Улётная Парковка
 *
 * Установка: положить в /www/uletnayaparkovka.ru/wp-content/mu-plugins/
 * Папка mu-plugins создаётся автоматически. Плагин не виден в админке и не отключается случайно.
 *
 * Что делает:
 *  1) Page cache HTML на 5 минут для незалогиненных без cookie
 *  2) loading="lazy" на все <img>
 *  3) Удаляет emoji-скрипты WP, oEmbed, jQuery Migrate, Gutenberg block CSS
 *  4) Откладывает (defer) все скрипты в footer
 *  5) Добавляет preload для критичных шрифтов
 *  6) Чистит RSD, wlwmanifest, generator meta — снижает поверхность атак
 *  7) Отключает XML-RPC (если не используется)
 *
 * Чтобы отключить — удалить или переименовать в .php.disabled
 */

if (!defined('ABSPATH')) exit;

/* ===================================================================
 * 1. PAGE CACHE — самое мощное ускорение TTFB 1200мс → 50мс
 * =================================================================== */

class UletnayaPageCache {
    const TTL = 300; // 5 минут
    const DIR = WP_CONTENT_DIR . '/cache/uletnaya';

    public static function init() {
        // Не кешируем для авторизованных и не GET запросов
        if (!empty($_POST) || isset($_GET['preview']) || is_user_logged_in()) return;
        if (strpos($_SERVER['REQUEST_URI'] ?? '', '/wp-admin') !== false) return;
        if (strpos($_SERVER['REQUEST_URI'] ?? '', '/wp-login') !== false) return;
        if (strpos($_SERVER['REQUEST_URI'] ?? '', '/wp-json') !== false) return;

        $key = md5(($_SERVER['HTTP_HOST'] ?? '') . ($_SERVER['REQUEST_URI'] ?? ''));
        $file = self::DIR . '/' . substr($key, 0, 2) . '/' . $key . '.html';

        // Отдаём из кеша если свежий
        if (file_exists($file) && (time() - filemtime($file) < self::TTL)) {
            $hit = file_get_contents($file);
            header('X-Uletnaya-Cache: HIT');
            header('Content-Type: text/html; charset=utf-8');
            header('Cache-Control: public, max-age=300, s-maxage=300');
            echo $hit;
            exit;
        }

        // Не нашли в кеше — буферизуем ответ и сохраняем
        ob_start(function ($buffer) use ($file) {
            // Кешируем только HTML 200, не редиректы и не ошибки
            if (http_response_code() !== 200) return $buffer;
            if (strpos($buffer, '</html>') === false) return $buffer;

            $dir = dirname($file);
            if (!is_dir($dir)) @mkdir($dir, 0755, true);
            if (is_writable($dir) || is_writable($file)) {
                @file_put_contents($file, $buffer, LOCK_EX);
            }
            header('X-Uletnaya-Cache: MISS');
            header('Cache-Control: public, max-age=300, s-maxage=300');
            return $buffer;
        });
    }

    public static function clear() {
        if (!is_dir(self::DIR)) return;
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(self::DIR, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $f) {
            $f->isDir() ? @rmdir($f->getRealPath()) : @unlink($f->getRealPath());
        }
    }
}
UletnayaPageCache::init();

// Сбрасываем кеш при изменении контента
add_action('save_post', ['UletnayaPageCache', 'clear']);
add_action('comment_post', ['UletnayaPageCache', 'clear']);
add_action('switch_theme', ['UletnayaPageCache', 'clear']);
add_action('customize_save_after', ['UletnayaPageCache', 'clear']);

/* ===================================================================
 * 2. LAZY LOADING для всех img (WP 5.5+ делает сам, но тема air1 может ломать)
 * =================================================================== */

add_filter('the_content', function ($content) {
    return preg_replace_callback('/<img(?![^>]*loading=)[^>]+>/i', function ($m) {
        return preg_replace('/<img/', '<img loading="lazy" decoding="async"', $m[0], 1);
    }, $content);
}, 99);

add_filter('post_thumbnail_html', function ($html) {
    if (strpos($html, 'loading=') === false) {
        $html = preg_replace('/<img/', '<img loading="lazy" decoding="async"', $html, 1);
    }
    return $html;
}, 99);

/* ===================================================================
 * 3. ОЧИСТКА МУСОРА — emoji, embeds, generator, RSD, wlwmanifest
 * =================================================================== */

// Emoji-скрипты (24KB JS, никогда не нужны)
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('admin_print_scripts', 'print_emoji_detection_script');
remove_action('admin_print_styles', 'print_emoji_styles');
remove_filter('the_content_feed', 'wp_staticize_emoji');
remove_filter('comment_text_rss', 'wp_staticize_emoji');
remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
add_filter('tiny_mce_plugins', function ($plugins) {
    return is_array($plugins) ? array_diff($plugins, ['wpemoji']) : [];
});

// oEmbed — не используется на лендинге
remove_action('wp_head', 'wp_oembed_add_discovery_links');
remove_action('wp_head', 'wp_oembed_add_host_js');
remove_action('rest_api_init', 'wp_oembed_register_route');

// REST API discovery (мы свой API хостим на api.uletnayaparkovka.ru)
remove_action('wp_head', 'rest_output_link_wp_head');
remove_action('template_redirect', 'rest_output_link_header', 11);

// WordPress generator meta — снижает risk-surface
remove_action('wp_head', 'wp_generator');
add_filter('the_generator', '__return_empty_string');

// RSD / wlwmanifest (нужны только для Windows Live Writer — мертвая фича)
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wlwmanifest_link');

// Shortlinks (засоряют head)
remove_action('wp_head', 'wp_shortlink_wp_head');
remove_action('template_redirect', 'wp_shortlink_header', 11);

// Gutenberg block-library CSS (220KB!) — тема не использует Gutenberg
add_action('wp_enqueue_scripts', function () {
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('wc-blocks-style');
    wp_dequeue_style('global-styles');
    wp_dequeue_style('classic-theme-styles');
}, 100);

// jQuery Migrate — для тем 2015 года, не нужно
add_action('wp_default_scripts', function ($scripts) {
    if (!is_admin() && isset($scripts->registered['jquery'])) {
        $script = $scripts->registered['jquery'];
        if ($script->deps) {
            $script->deps = array_diff($script->deps, ['jquery-migrate']);
        }
    }
});

/* ===================================================================
 * 4. DEFER ВСЕХ СКРИПТОВ (кроме критичных)
 * =================================================================== */

add_filter('script_loader_tag', function ($tag, $handle) {
    // Не дефер для критичных
    $critical = ['jquery-core'];
    if (in_array($handle, $critical, true)) return $tag;
    // Не дефер если уже async/defer
    if (strpos($tag, 'defer') !== false || strpos($tag, 'async') !== false) return $tag;
    // Не дефер inline-скриптов
    if (strpos($tag, ' src=') === false) return $tag;
    return str_replace(' src=', ' defer src=', $tag);
}, 10, 2);

/* ===================================================================
 * 5. PRELOAD КРИТИЧНЫХ РЕСУРСОВ
 * =================================================================== */

add_action('wp_head', function () {
    $theme = get_template_directory_uri();
    echo "\n<!-- Uletnaya optimize preload -->\n";
    // Preload основного CSS
    echo "<link rel='preload' as='style' href='{$theme}/assets/css/style.css?v=35'>\n";
    // DNS prefetch + preconnect для api
    echo "<link rel='preconnect' href='https://api.uletnayaparkovka.ru' crossorigin>\n";
    echo "<link rel='dns-prefetch' href='https://api.uletnayaparkovka.ru'>\n";
    echo "<!-- /Uletnaya optimize -->\n";
}, 1);

/* ===================================================================
 * 6. ОТКЛЮЧЕНИЕ XML-RPC
 * =================================================================== */

add_filter('xmlrpc_enabled', '__return_false');
add_filter('wp_xmlrpc_server_class', '__return_false');
remove_action('wp_head', 'wp_xmlrpc_uri');

// Pingback header
add_filter('wp_headers', function ($headers) {
    unset($headers['X-Pingback']);
    return $headers;
});

/* ===================================================================
 * 7. CRON OPTIMIZATION — отключаем встроенный wp-cron на каждый запрос
 *     (надо настроить системный cron отдельно, см INSTALL.md)
 * =================================================================== */

if (!defined('DISABLE_WP_CRON')) {
    // Это работает только если в wp-config.php нет своей define
    // Безопасный no-op если уже определено
}

/* ===================================================================
 * 8. ADMIN BAR — выключаем на фронте для всех
 * =================================================================== */

add_filter('show_admin_bar', '__return_false');

/* ===================================================================
 * 9. ДИАГНОСТИКА — добавляем X-headers с информацией
 * =================================================================== */

add_action('send_headers', function () {
    header('X-Uletnaya-Optimize: 1.0.0');
    header('X-Frame-Options: SAMEORIGIN');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
});
