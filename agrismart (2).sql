-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : dim. 12 avr. 2026 à 12:38
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `agrismart`
--

-- --------------------------------------------------------

--
-- Structure de la table `alertes`
--

CREATE TABLE `alertes` (
  `id` int(11) NOT NULL,
  `type` enum('crit','warn','info','ok') NOT NULL DEFAULT 'info',
  `titre` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `node_id` varchar(20) DEFAULT NULL,
  `lue` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `alertes`
--

INSERT INTO `alertes` (`id`, `type`, `titre`, `description`, `node_id`, `lue`, `created_at`) VALUES
(1, 'crit', 'Humidité Sol Critique — Zone B', 'Valeur : 18% — Seuil minimum : 25%. Irrigation urgente requise.', 'ESP32-02', 1, '2026-03-09 22:47:30'),
(2, 'warn', 'pH anormal — Zone C', 'Valeur : 4.8 — Sol trop acide. Traitement recommandé.', 'ESP32-02', 1, '2026-03-09 22:47:30'),
(3, 'warn', 'Batterie faible — Nœud ESP32-02', 'Niveau : 12%. Remplacement requis dans 48h.', 'ESP32-02', 1, '2026-03-09 22:47:30'),
(4, 'info', 'Mise à jour modèle RF', 'Nouveau modèle déployé. Précision améliorée à 98.0%.', NULL, 1, '2026-03-09 22:47:30');

-- --------------------------------------------------------

--
-- Structure de la table `capteurs`
--

CREATE TABLE `capteurs` (
  `id` int(11) NOT NULL,
  `node_id` varchar(20) NOT NULL DEFAULT 'ESP32-01',
  `temperature` decimal(5,2) DEFAULT NULL,
  `humidite_sol` int(11) DEFAULT NULL,
  `humidite_air` int(11) DEFAULT NULL,
  `ph` decimal(4,2) DEFAULT NULL,
  `azote` int(11) DEFAULT NULL,
  `phosphore` int(11) DEFAULT NULL,
  `potassium` int(11) DEFAULT NULL,
  `luminosite` int(11) DEFAULT NULL,
  `co2` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `capteurs`
--

INSERT INTO `capteurs` (`id`, `node_id`, `temperature`, `humidite_sol`, `humidite_air`, `ph`, `azote`, `phosphore`, `potassium`, `luminosite`, `co2`, `created_at`) VALUES
(1, 'ESP32-01', 24.30, 42, 65, 6.80, 75, 45, 60, 780, 395, '2026-03-09 21:47:30'),
(2, 'ESP32-02', 26.10, 18, 70, 4.80, 60, 30, 55, 820, 402, '2026-03-09 20:47:30'),
(3, 'ESP32-03', 23.80, 55, 68, 6.20, 90, 50, 70, 650, 388, '2026-03-09 20:47:30'),
(4, 'ESP32-01', 25.00, 38, 64, 6.90, 72, 42, 58, 800, 392, '2026-03-09 19:47:30'),
(5, 'ESP32-04', 27.50, 33, 72, 7.10, 85, 55, 65, 760, 405, '2026-03-09 18:47:30'),
(6, 'ESP32-02', 28.20, 20, 75, 4.90, 58, 28, 52, 710, 398, '2026-03-09 17:47:30'),
(7, 'ESP32-05', 22.90, 48, 62, 6.50, 80, 48, 62, 830, 390, '2026-03-09 16:47:30'),
(8, 'ESP32-03', 24.60, 51, 66, 6.30, 88, 52, 68, 680, 385, '2026-03-09 15:47:30'),
(9, 'ESP32-01', 23.10, 45, 63, 6.70, 74, 44, 60, 795, 393, '2026-03-09 14:47:30'),
(10, 'ESP32-06', 21.40, 62, 60, 6.40, 92, 58, 72, 900, 380, '2026-03-09 13:47:30'),
(11, 'ESP32-01', 27.30, 55, 77, 7.00, 57, 40, 48, 966, 413, '2026-03-14 12:38:02');

-- --------------------------------------------------------

--
-- Structure de la table `historique_actions`
--

CREATE TABLE `historique_actions` (
  `id` int(11) NOT NULL,
  `node_id` varchar(20) NOT NULL,
  `action` enum('Aucune','Irrigation','Alerte pH','Fertilisation') NOT NULL DEFAULT 'Aucune',
  `ph` decimal(4,2) DEFAULT NULL,
  `humidite` int(11) DEFAULT NULL,
  `temperature` decimal(5,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `historique_actions`
--

INSERT INTO `historique_actions` (`id`, `node_id`, `action`, `ph`, `humidite`, `temperature`, `created_at`) VALUES
(1, 'ESP32-01', 'Aucune', 6.80, 42, 24.30, '2026-03-09 21:47:30'),
(2, 'ESP32-02', 'Irrigation', 4.80, 18, 26.10, '2026-03-09 20:47:30'),
(3, 'ESP32-03', 'Aucune', 6.20, 55, 23.80, '2026-03-09 19:47:30'),
(4, 'ESP32-02', 'Alerte pH', 4.90, 20, 28.20, '2026-03-09 18:47:30'),
(5, 'ESP32-04', 'Fertilisation', 7.10, 33, 27.50, '2026-03-09 17:47:30'),
(6, 'ESP32-05', 'Aucune', 6.50, 48, 22.90, '2026-03-09 16:47:30'),
(7, 'ESP32-01', 'Irrigation', 6.70, 45, 23.10, '2026-03-09 15:47:30'),
(8, 'ESP32-06', 'Aucune', 6.40, 62, 21.40, '2026-03-09 14:47:30'),
(9, 'ESP32-03', 'Fertilisation', 6.30, 51, 24.60, '2026-03-09 13:47:30'),
(10, 'ESP32-02', 'Alerte pH', 5.00, 22, 25.50, '2026-03-09 12:47:30');

-- --------------------------------------------------------

--
-- Structure de la table `journal_systeme`
--

CREATE TABLE `journal_systeme` (
  `id` int(11) NOT NULL,
  `type` enum('ok','warn','err','info') DEFAULT 'info',
  `message` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `journal_systeme`
--

INSERT INTO `journal_systeme` (`id`, `type`, `message`, `created_at`) VALUES
(1, 'ok', 'Utilisateur modifié : norane Benkhaled (ID: 1)', '2026-03-09 22:54:42'),
(2, 'ok', 'Connexion: Admin  (Admin)', '2026-03-09 23:11:47'),
(3, 'ok', 'Connexion: norane Benkhaled (Agriculteur)', '2026-03-09 23:12:10'),
(4, 'ok', 'Connexion: Admin  (Admin)', '2026-03-09 23:14:05'),
(5, 'ok', 'Connexion: norane Benkhaled (Agriculteur)', '2026-03-09 23:14:22'),
(6, 'ok', 'Connexion: Admin  (Admin)', '2026-03-09 23:14:37'),
(7, 'ok', 'Connexion: Admin  (Admin)', '2026-03-09 23:15:04'),
(8, 'ok', 'Connexion: Admin  (Admin)', '2026-03-09 23:19:39'),
(9, 'ok', 'Connexion: Admin  (Admin)', '2026-03-09 23:37:54'),
(10, 'ok', 'Connexion: Admin  (Admin)', '2026-03-09 23:41:28'),
(11, 'ok', 'Connexion: Admin  (Admin)', '2026-03-09 23:41:58'),
(12, 'ok', 'Connexion: Karim Hadj (Technicien)', '2026-03-09 23:45:53'),
(13, 'ok', 'Connexion: norane Benkhaled (Agriculteur)', '2026-03-09 23:47:10'),
(14, 'ok', 'Connexion: Admin  (Admin)', '2026-03-09 23:47:25'),
(15, 'ok', 'Modifie: fadia belazzoug (ID:2)', '2026-03-09 23:48:06'),
(16, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 18:09:16'),
(17, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 18:09:37'),
(18, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 18:28:14'),
(19, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 18:28:18'),
(20, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:35:58'),
(21, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:36:00'),
(22, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:36:00'),
(23, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:37:10'),
(24, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:37:10'),
(25, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:37:10'),
(26, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:37:11'),
(27, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:37:11'),
(28, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:37:11'),
(29, 'ok', 'Connexion: norane Benkhaled (Agriculteur)', '2026-03-10 21:37:29'),
(30, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:40:38'),
(31, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:43'),
(32, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:44'),
(33, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:44'),
(34, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:45'),
(35, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:45'),
(36, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:45'),
(37, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:45'),
(38, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:50'),
(39, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:51'),
(40, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:51'),
(41, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:52'),
(42, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:52'),
(43, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:52'),
(44, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:48:52'),
(45, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:49:25'),
(46, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:49:26'),
(47, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:49:26'),
(48, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:00'),
(49, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:01'),
(50, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:02'),
(51, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:02'),
(52, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:02'),
(53, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:18'),
(54, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:19'),
(55, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:19'),
(56, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:20'),
(57, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:20'),
(58, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:20'),
(59, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:20'),
(60, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:52:20'),
(61, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:18'),
(62, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:19'),
(63, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:19'),
(64, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:19'),
(65, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:19'),
(66, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:20'),
(67, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:20'),
(68, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:26'),
(69, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:26'),
(70, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:26'),
(71, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:26'),
(72, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:26'),
(73, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:27'),
(74, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:27'),
(75, 'ok', 'Connexion: Admin  (Admin)', '2026-03-10 21:54:28'),
(76, 'ok', 'Connexion: Admin  (Admin)', '2026-03-14 12:17:43'),
(77, 'ok', 'Connexion: norane Benkhaled (Agriculteur)', '2026-03-14 12:40:45'),
(78, 'ok', 'Connexion: Admin  (Admin)', '2026-03-29 23:18:02'),
(79, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 14:39:08'),
(80, 'ok', 'Compte cree: youcef benkhaled (Agriculteur)', '2026-03-30 14:41:19'),
(81, 'ok', 'Connexion: youcef benkhaled (Agriculteur)', '2026-03-30 14:41:53'),
(82, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 15:26:06'),
(83, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 15:26:11'),
(84, 'ok', 'Connexion: youcef benkhaled (Agriculteur)', '2026-03-30 15:26:25'),
(85, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 15:26:35'),
(86, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 15:31:59'),
(87, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 15:40:42'),
(88, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 15:42:47'),
(89, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 15:43:42'),
(90, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 15:47:42'),
(91, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:22:49'),
(92, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:24:29'),
(93, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:31:17'),
(94, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:34:40'),
(95, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:34:55'),
(96, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:35:19'),
(97, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:39:29'),
(98, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:45:39'),
(99, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:46:17'),
(100, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:52:23'),
(101, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:52:39'),
(102, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:55:40'),
(103, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 20:57:23'),
(104, 'ok', 'Connexion: norane Benkhaled (Agriculteur)', '2026-03-30 21:03:29'),
(105, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 21:05:16'),
(106, 'ok', 'Connexion: Admin  (Admin)', '2026-03-30 21:05:38'),
(107, 'ok', 'Connexion: Admin  (Admin)', '2026-03-31 12:46:49'),
(108, 'ok', 'Connexion: Admin  (Admin)', '2026-03-31 12:52:50'),
(109, 'ok', 'Connexion: Admin  (Admin)', '2026-03-31 13:01:42'),
(110, 'ok', 'Connexion: Admin  (Admin)', '2026-03-31 13:04:49'),
(111, 'ok', 'Connexion: Admin  (Admin)', '2026-03-31 13:28:59'),
(112, 'ok', 'Connexion: Admin  (Admin)', '2026-03-31 13:30:06'),
(113, 'ok', 'Connexion: Admin  (Admin)', '2026-03-31 12:30:22'),
(114, 'ok', 'Connexion: Admin  (Admin)', '2026-03-31 12:30:38'),
(115, 'ok', 'Connexion: Admin  (Admin)', '2026-03-31 13:46:17'),
(116, 'ok', 'Connexion: Admin  (Admin)', '2026-04-01 01:54:07'),
(117, 'ok', 'Connexion: Admin  (Admin)', '2026-04-02 16:50:21'),
(118, 'ok', 'Connexion: Admin  (Admin)', '2026-04-02 17:22:04'),
(119, 'ok', 'Connexion: Admin  (Admin)', '2026-04-02 17:22:27'),
(120, 'ok', 'Connexion: Admin  (Admin)', '2026-04-02 17:38:00'),
(121, 'ok', 'Connexion: Admin  (Admin)', '2026-04-02 19:28:41'),
(122, 'ok', 'Connexion: Admin  (Admin)', '2026-04-03 00:52:27'),
(123, 'ok', 'Connexion: Admin  (Admin)', '2026-04-03 00:55:03'),
(124, 'ok', 'Connexion: Admin  (Admin)', '2026-04-04 14:01:04'),
(125, 'ok', 'Connexion: Admin  (Admin)', '2026-04-04 14:21:28'),
(126, 'ok', 'Connexion: Admin  (Admin)', '2026-04-04 14:22:01'),
(127, 'ok', 'Connexion: Admin  (Admin)', '2026-04-04 14:23:10'),
(128, 'ok', 'Connexion: Admin  (Admin)', '2026-04-04 14:32:39'),
(129, 'ok', 'Connexion: Admin  (Admin)', '2026-04-04 14:33:11'),
(130, 'ok', 'Connexion: Admin  (Admin)', '2026-04-06 20:15:57'),
(131, 'ok', 'Connexion: Admin  (Admin)', '2026-04-06 20:17:07'),
(132, 'ok', 'Connexion: Admin  (Admin)', '2026-04-06 20:19:32'),
(133, 'ok', 'Connexion: norane Benkhaled (Agriculteur)', '2026-04-06 20:20:04'),
(134, 'ok', 'Connexion: Admin  (Admin)', '2026-04-06 20:21:16'),
(135, 'ok', 'Connexion: Admin  (Admin)', '2026-04-06 20:33:09'),
(136, 'ok', 'Connexion: Admin  (Admin)', '2026-04-06 20:39:05'),
(137, 'ok', 'Connexion: norane Benkhaled (Agriculteur)', '2026-04-08 21:01:50'),
(138, 'ok', 'Connexion: Admin  (Admin)', '2026-04-08 21:04:58'),
(139, 'ok', 'Connexion: Admin  (Admin)', '2026-04-12 11:53:40'),
(140, 'ok', 'Connexion: Admin  (Admin)', '2026-04-12 12:16:23'),
(141, 'ok', 'Connexion: Admin  (Admin)', '2026-04-12 12:17:48'),
(142, 'ok', 'Connexion: Admin  (Admin)', '2026-04-12 12:17:57'),
(143, 'ok', 'Connexion: Admin  (Admin)', '2026-04-12 12:20:13'),
(144, 'ok', 'Connexion: norane Benkhaled (Agriculteur)', '2026-04-12 12:21:29');

-- --------------------------------------------------------

--
-- Structure de la table `noeuds_iot`
--

CREATE TABLE `noeuds_iot` (
  `id` int(11) NOT NULL,
  `node_id` varchar(20) NOT NULL,
  `zone` varchar(100) NOT NULL,
  `rssi` varchar(20) DEFAULT '-88 dBm',
  `batterie` int(11) NOT NULL DEFAULT 100,
  `sf` varchar(10) DEFAULT 'SF7',
  `statut` enum('online','warn','offline') NOT NULL DEFAULT 'online',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `noeuds_iot`
--

INSERT INTO `noeuds_iot` (`id`, `node_id`, `zone`, `rssi`, `batterie`, `sf`, `statut`, `updated_at`) VALUES
(1, 'ESP32-01', 'Zone A — Nord', '-88 dBm', 87, 'SF7', 'online', '2026-03-09 22:47:30'),
(2, 'ESP32-02', 'Zone B — Centre', '-94 dBm', 12, 'SF9', 'warn', '2026-03-09 22:47:30'),
(3, 'ESP32-03', 'Zone C — Sud', '-91 dBm', 72, 'SF8', 'online', '2026-03-09 22:47:30'),
(4, 'ESP32-04', 'Zone D — Est', '-89 dBm', 55, 'SF7', 'online', '2026-03-09 22:47:30'),
(5, 'ESP32-05', 'Zone E — Ouest', '-96 dBm', 43, 'SF10', 'online', '2026-03-09 22:47:30'),
(6, 'ESP32-06', 'Zone F — Serre', '-85 dBm', 91, 'SF7', 'online', '2026-03-09 22:47:30'),
(7, 'ARD-01', 'Zone A — Terrain', 'USB', 100, 'USB', 'offline', '2026-04-04 14:20:44');

-- --------------------------------------------------------

--
-- Structure de la table `predictions_rf`
--

CREATE TABLE `predictions_rf` (
  `id` int(11) NOT NULL,
  `culture` varchar(100) NOT NULL,
  `emoji` varchar(10) NOT NULL DEFAULT '?',
  `confiance` int(11) NOT NULL DEFAULT 0,
  `ph` decimal(4,2) DEFAULT NULL,
  `humidite_sol` int(11) DEFAULT NULL,
  `azote` int(11) DEFAULT NULL,
  `temperature` decimal(5,2) DEFAULT NULL,
  `precipitations` int(11) DEFAULT NULL,
  `humidite_air` int(11) DEFAULT NULL,
  `phosphore` int(11) DEFAULT NULL,
  `potassium` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `predictions_rf`
--

INSERT INTO `predictions_rf` (`id`, `culture`, `emoji`, `confiance`, `ph`, `humidite_sol`, `azote`, `temperature`, `precipitations`, `humidite_air`, `phosphore`, `potassium`, `created_at`) VALUES
(1, 'Blé', '🌾', 84, 6.80, 42, 75, 24.30, 85, 65, 45, 60, '2026-03-09 22:47:30'),
(2, 'Maïs', '🌽', 71, 6.20, 55, 90, 23.80, 95, 68, 50, 70, '2026-03-09 22:47:30'),
(3, 'Orge', '🌾', 68, 6.90, 38, 72, 25.00, 80, 64, 42, 58, '2026-03-09 22:47:30'),
(4, 'Pois chiche', '🫘', 100, 4.10, 8, 22, 14.00, 29, 29, 17, 25, '2026-03-14 12:39:19'),
(5, 'Tournesol', '🌻', 45, 6.50, 45, 38, 25.00, 85, 65, 40, 40, '2026-03-31 12:54:03'),
(6, 'Tournesol', '🌻', 100, 6.50, 45, 60, 25.00, 85, 65, 40, 40, '2026-03-31 13:02:27'),
(7, 'Blé', '🌾', 62, 6.50, 45, 106, 36.00, 85, 65, 40, 40, '2026-04-02 17:25:19'),
(8, 'Blé', '🌾', 87, 6.50, 30, 106, 45.00, 85, 65, 40, 40, '2026-04-02 17:28:08'),
(9, 'Blé', '🌾', 94, 6.50, 30, 106, 8.00, 85, 65, 40, 40, '2026-04-02 17:29:00'),
(10, 'Pois chiche', '🫘', 100, 5.10, 0, 9, 8.00, 20, 14, 0, 0, '2026-04-02 17:29:42'),
(11, 'Tournesol', '🌻', 100, 6.50, 45, 60, 25.00, 85, 65, 40, 40, '2026-04-06 20:17:16'),
(12, 'Tournesol', '🌻', 100, 6.50, 45, 60, 25.00, 85, 65, 40, 40, '2026-04-06 20:33:35'),
(13, 'Mangue', '🥭', 13, 3.00, 11, 0, 8.00, 20, 20, 40, 6, '2026-04-06 20:34:33'),
(14, 'عباد الشمس', '🌻', 100, 6.50, 45, 60, 25.00, 85, 65, 40, 40, '2026-04-08 21:02:51');

-- --------------------------------------------------------

--
-- Structure de la table `timeline`
--

CREATE TABLE `timeline` (
  `id` int(11) NOT NULL,
  `icone` varchar(10) NOT NULL DEFAULT '?',
  `couleur_bg` varchar(20) NOT NULL DEFAULT '#e0f2fe',
  `titre` varchar(200) NOT NULL,
  `sous_titre` varchar(200) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `timeline`
--

INSERT INTO `timeline` (`id`, `icone`, `couleur_bg`, `titre`, `sous_titre`, `created_at`) VALUES
(1, '💧', '#e0f2fe', 'Irrigation automatique', 'Zone B — 25 litres/m²', '2026-03-09 22:22:30'),
(2, '🌲', '#f0fdf4', 'RF — Blé recommandé', 'Confiance : 84%', '2026-03-09 22:10:30'),
(3, '🔴', '#fee2e2', 'Alerte pH critique', 'Nœud ESP32-03 — pH 4.7', '2026-03-09 21:45:30'),
(4, '📡', '#e0f2fe', 'Sync LoRaWAN', '6 nœuds synchronisés', '2026-03-09 20:47:30'),
(5, '📈', '#ede9fe', 'Prévision LSTM mise à jour', 'Horizon 7j — MAE 0.023', '2026-03-09 19:47:30'),
(6, '🌲', '#f0fdf4', 'RF — Pois chiche recommandé', 'Confiance : 100%', '2026-03-14 12:39:19'),
(7, '🌲', '#f0fdf4', 'RF — Tournesol recommandé', 'Confiance : 45%', '2026-03-31 12:54:03'),
(8, '🌲', '#f0fdf4', 'RF — Tournesol recommandé', 'Confiance : 100%', '2026-03-31 13:02:27'),
(9, '🌲', '#f0fdf4', 'RF — Blé recommandé', 'Confiance : 62%', '2026-04-02 17:25:19'),
(10, '🌲', '#f0fdf4', 'RF — Blé recommandé', 'Confiance : 87%', '2026-04-02 17:28:08'),
(11, '🌲', '#f0fdf4', 'RF — Blé recommandé', 'Confiance : 94%', '2026-04-02 17:29:00'),
(12, '🌲', '#f0fdf4', 'RF — Pois chiche recommandé', 'Confiance : 100%', '2026-04-02 17:29:42'),
(13, '🌲', '#f0fdf4', 'RF — Tournesol recommandé', 'Confiance : 100%', '2026-04-06 20:17:16'),
(14, '🌲', '#f0fdf4', 'RF — Tournesol recommandé', 'Confiance : 100%', '2026-04-06 20:33:35'),
(15, '🌲', '#f0fdf4', 'RF — Mangue recommandé', 'Confiance : 13%', '2026-04-06 20:34:33'),
(16, '🌲', '#f0fdf4', 'RF — عباد الشمس recommandé', 'Confiance : 100%', '2026-04-08 21:02:51');

-- --------------------------------------------------------

--
-- Structure de la table `utilisateurs`
--

CREATE TABLE `utilisateurs` (
  `id` int(11) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `nom` varchar(100) NOT NULL DEFAULT '',
  `login` varchar(100) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `role` enum('Admin','Agriculteur','Technicien') NOT NULL DEFAULT 'Agriculteur',
  `zone` varchar(200) NOT NULL DEFAULT '',
  `telephone` varchar(50) NOT NULL DEFAULT '',
  `statut` enum('Actif','Inactif','Suspendu') NOT NULL DEFAULT 'Actif',
  `date_creation` date NOT NULL DEFAULT curdate(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `utilisateurs`
--

INSERT INTO `utilisateurs` (`id`, `prenom`, `nom`, `login`, `mot_de_passe`, `role`, `zone`, `telephone`, `statut`, `date_creation`, `updated_at`) VALUES
(1, 'norane', 'Benkhaled', 'norane', '$2y$10$o8sRDpCWspy3ilWXZF.0U.xfpds5STLBySAiQ8VfLq5nGwmiyXIwe', 'Agriculteur', 'Zone A–B', '+213 550 12 34 56', 'Actif', '2024-01-10', '2026-03-09 22:54:42'),
(2, 'fadia', 'belazzoug', 'fadia', '$2y$10$P7xD4luQk/m8xf6KxWFIP.7H4l73.Ey2dHFhDt6EVfzvccgxd0bRG', 'Technicien', 'Tout le site', '+213 661 98 76 54', 'Actif', '2024-01-12', '2026-03-09 23:48:06'),
(3, 'Sara', 'Amrani', 'sara', '$2y$10$vUA0vpcEsLBz2gxN1taM8e5Uz5n6p9SUbO83PGuUkGs1ygIDjHCgy', 'Agriculteur', 'Zone C', '+213 770 45 67 89', 'Actif', '2024-02-03', '2026-03-09 22:49:10'),
(4, 'Youcef', 'Kader', 'youcef', '$2y$10$vUA0vpcEsLBz2gxN1taM8e5Uz5n6p9SUbO83PGuUkGs1ygIDjHCgy', 'Agriculteur', 'Zone D–E', '+213 555 22 11 00', 'Inactif', '2024-02-14', '2026-03-09 22:49:10'),
(5, 'Nadia', 'Rahmani', 'nadia', '$2y$10$vUA0vpcEsLBz2gxN1taM8e5Uz5n6p9SUbO83PGuUkGs1ygIDjHCgy', 'Technicien', 'Zone B–C', '+213 660 33 44 55', 'Actif', '2024-03-01', '2026-03-09 22:49:10'),
(6, 'Admin', '', 'admin', '$2y$10$vUA0vpcEsLBz2gxN1taM8e5Uz5n6p9SUbO83PGuUkGs1ygIDjHCgy', 'Admin', 'Tout', '+213 700 00 00 01', 'Actif', '2024-01-01', '2026-03-09 22:49:10'),
(7, 'youcef', 'benkhaled', 'youceff', '$2y$10$MBR08jZ71eARf9aCuMPDaO6fHO6.AsOzbQj6VIQhB.cGye8RloyX.', 'Agriculteur', 'A', '+213 661 98 76 54', 'Actif', '2026-03-30', '2026-03-30 14:41:19');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `alertes`
--
ALTER TABLE `alertes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_alertes_lue` (`lue`);

--
-- Index pour la table `capteurs`
--
ALTER TABLE `capteurs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_capteurs_node` (`node_id`),
  ADD KEY `idx_capteurs_time` (`created_at`);

--
-- Index pour la table `historique_actions`
--
ALTER TABLE `historique_actions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_hist_node` (`node_id`),
  ADD KEY `idx_hist_time` (`created_at`);

--
-- Index pour la table `journal_systeme`
--
ALTER TABLE `journal_systeme`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `noeuds_iot`
--
ALTER TABLE `noeuds_iot`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `node_id` (`node_id`);

--
-- Index pour la table `predictions_rf`
--
ALTER TABLE `predictions_rf`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rf_time` (`created_at`);

--
-- Index pour la table `timeline`
--
ALTER TABLE `timeline`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_timeline_time` (`created_at`);

--
-- Index pour la table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `login` (`login`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `alertes`
--
ALTER TABLE `alertes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `capteurs`
--
ALTER TABLE `capteurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT pour la table `historique_actions`
--
ALTER TABLE `historique_actions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT pour la table `journal_systeme`
--
ALTER TABLE `journal_systeme`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=145;

--
-- AUTO_INCREMENT pour la table `noeuds_iot`
--
ALTER TABLE `noeuds_iot`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `predictions_rf`
--
ALTER TABLE `predictions_rf`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT pour la table `timeline`
--
ALTER TABLE `timeline`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pour la table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
