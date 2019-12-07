using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing.Imaging;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using ZXing;
using ZXing.QrCode;

namespace JudgingLauncher
{
	/// <summary>
	/// Interaction logic for MainWindow.xaml
	/// </summary>
	public partial class MainWindow : Window, INotifyPropertyChanged
	{
		public event PropertyChangedEventHandler PropertyChanged;
		protected void OnPropertyChanged(string name)
		{
			PropertyChangedEventHandler handler = PropertyChanged;
			if (handler != null)
			{
				handler(this, new PropertyChangedEventArgs(name));
			}
		}

		const string dataFolderPath = "JudgingeLauncherData";
		const string nodejsInstallerFilename = "node-v12.13.1-x64.msi";
		public string ClientOutputText
		{
			get { return clientOutputText; }
			set
			{
				clientOutputText = value;

				const int maxLen = 10000;
				if (clientOutputText.Length > maxLen)
				{
					clientOutputText = clientOutputText.Substring(clientOutputText.Length - maxLen);
				}

				ClientOutputTextbox.ScrollToEnd();
			}
		}
		string clientOutputText = "";
		public ObservableCollection<string> LanModeOptions
		{
			get { return lanModeOptions; }
			set
			{
				lanModeOptions = value;
				OnPropertyChanged("LanModeOptions");
			}
		}
		ObservableCollection<string> lanModeOptions = new ObservableCollection<string>();
		public string LanModeSelectedItem
		{
			get { return lanModeSelectedItem; }
			set
			{
				lanModeSelectedItem = value;
				OnPropertyChanged("LanModeSelectedItem");

				Properties.Settings.Default.LanModeSelectedItem = value;
				Properties.Settings.Default.Save();
			}
		}
		string lanModeSelectedItem = "";
		public bool IsLanMode { get { return LanModeSelectedItem != "Disabled"; } }
		public ObservableCollection<string> JudgeCountOptions
		{
			get { return judgeCountOptions; }
			set
			{
				judgeCountOptions = value;
				OnPropertyChanged("JudgeCountOptions");
			}
		}
		ObservableCollection<string> judgeCountOptions = new ObservableCollection<string>() { "3", "6", "9" };
		public string JudgeCountSelectedItem
		{
			get { return judgeCountSelectedItem; }
			set
			{
				judgeCountSelectedItem = value;
				OnPropertyChanged("JudgeCountSelectedItem");

				Properties.Settings.Default.JudgeCountSelectedItem = value;
				Properties.Settings.Default.Save();
			}
		}
		string judgeCountSelectedItem = "";
		public BitmapImage QrCodeImage0
		{
			get { return qrCodeImage0; }
			set
			{
				qrCodeImage0 = value;
				OnPropertyChanged("QrCodeImage0");
			}
		}
		BitmapImage qrCodeImage0 = new BitmapImage();


		public string TournamentName
		{
			get { return tournamentName; }
			set
			{
				tournamentName = value;

				OnPropertyChanged("TournamentName");

				Properties.Settings.Default.TournamentName = tournamentName;
				Properties.Settings.Default.Save();
			}
		}
		string tournamentName = "";

		Thread clientThread;
		Process clientProcess;
		public string ServerOutputText
		{
			get { return serverOutputText; }
			set
			{
				serverOutputText = value;

				const int maxLen = 10000;
				if (serverOutputText.Length > maxLen)
				{
					serverOutputText = serverOutputText.Substring(serverOutputText.Length - maxLen);
				}

				ServerOutputTextbox.ScrollToEnd();
			}
		}
		string serverOutputText = "";
		Thread serverThread;
		Process serverProcess;

		public MainWindow()
		{
			InitializeComponent();

			TopLevelGrid.DataContext = this;
		}

		private void Window_Loaded(object sender, RoutedEventArgs e)
		{
			CreateDataDirectory();

			TournamentName = Properties.Settings.Default.TournamentName;

			LanModeOptions.Add("Disabled");

			var host = Dns.GetHostEntry(Dns.GetHostName());
			foreach (var ip in host.AddressList)
			{
				if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
				{
					LanModeOptions.Add(ip.ToString());
				}
			}

			LanModeSelectedItem = Properties.Settings.Default.LanModeSelectedItem;

			JudgeCountSelectedItem = Properties.Settings.Default.JudgeCountSelectedItem;

			SetupLinkButtons();
			SetupQrCodes();
		}

		private void SafeDirectoryDelete(string path)
		{
			if (Directory.Exists(path))
			{
				Directory.Delete(path, true);
			}
		}

		private void SafeDeleteFile(string filename)
		{
			if (File.Exists(filename))
			{
				File.Delete(filename);
			}
		}

		private void DownloadDepot()
		{
			string completeJudgingZipFilename = Path.Combine(dataFolderPath, "CompleteJudging.zip");
			string completeJudgingDepot = Path.Combine(dataFolderPath, "Depot");

			try
			{
				using (var client = new WebClient())
				{
					client.DownloadFile("https://github.com/SmilesAir/CompleteJudging/archive/master.zip", completeJudgingZipFilename);
				}
			}
			catch (Exception exception)
			{
				Console.WriteLine(exception.Message);
			}

			if (File.Exists(completeJudgingZipFilename))
			{
				try
				{
					string tempUnzipPath = Path.Combine(dataFolderPath, "TempUnzip");
					SafeDirectoryDelete(tempUnzipPath);

					ZipFile.ExtractToDirectory(completeJudgingZipFilename, tempUnzipPath);

					SafeDirectoryDelete(completeJudgingDepot);

					List<string> depotDirs = new List<string>(Directory.EnumerateDirectories(tempUnzipPath));

					Directory.Move(depotDirs[0], completeJudgingDepot);

					SafeDirectoryDelete(tempUnzipPath);
					SafeDeleteFile(completeJudgingZipFilename);
				}
				catch (Exception exception)
				{
					Console.WriteLine(exception.Message);
				}
			}
			else
			{
				// Error
			}
		}

		private void CreateDataDirectory()
		{
			try
			{
				if (!Directory.Exists(dataFolderPath))
				{
					Directory.CreateDirectory(dataFolderPath);
				}
			}
			catch (Exception exception)
			{
				Console.WriteLine(exception.Message);
			}
		}

		private void CheckNodejsAndInstall()
		{
			Process cmd = new Process();
			cmd.StartInfo.FileName = "cmd.exe";
			cmd.StartInfo.RedirectStandardInput = true;
			cmd.StartInfo.RedirectStandardOutput = true;
			cmd.StartInfo.CreateNoWindow = true;
			cmd.StartInfo.UseShellExecute = false;
			cmd.Start();

			cmd.StandardInput.WriteLine("npm");
			cmd.StandardInput.Flush();
			cmd.StandardInput.Close();

			cmd.WaitForExit();

			string output = cmd.StandardOutput.ReadToEnd();
			if (!output.Contains("Usage: npm <command>"))
			{
				if (MessageBox.Show("Click OK to install Node.js", "Attention", MessageBoxButton.OKCancel) == MessageBoxResult.OK)
				{
					Process.Start(nodejsInstallerFilename);
				}
			}
			else
			{
				MessageBox.Show("Node.js already installed", "Attention");
			}
		}

		private void StartClient()
		{
			clientThread = new Thread((() =>
			{
				clientProcess = new Process();
				clientProcess.StartInfo.FileName = "cmd";
				clientProcess.StartInfo.RedirectStandardInput = true;
				clientProcess.StartInfo.RedirectStandardOutput = true;
				clientProcess.StartInfo.CreateNoWindow = true;
				clientProcess.StartInfo.UseShellExecute = false;
				clientProcess.Start();
				clientProcess.BeginOutputReadLine();

				string cd = "cd " + Path.Combine(dataFolderPath, "Depot", "client");
				clientProcess.StandardInput.WriteLine(cd);

				clientProcess.StandardInput.WriteLine("npm start");

				clientProcess.StandardInput.Flush();
				clientProcess.StandardInput.Close();

				string newText = "";
				clientProcess.OutputDataReceived += (object sender, DataReceivedEventArgs e) =>
				{
					newText += e.Data + "\r\n";
				};

				DateTime lastClientOutputUpdateTime = DateTime.Now;
				while (true)
				{
					if (newText.Length > 0 && (DateTime.Now - lastClientOutputUpdateTime).TotalMilliseconds > 100)
					{
						if (Application.Current != null)
						{
							Application.Current.Dispatcher.Invoke(System.Windows.Threading.DispatcherPriority.Background,
							new Action(() =>
							{
								ClientOutputText += newText;
								newText = "";
								OnPropertyChanged("ClientOutputText");
							}));
						}
					}
				}
			}));

			clientThread.Start();
		}

		private void StartLocalServer()
		{
			serverThread = new Thread((() =>
			{
				serverProcess = new Process();
				serverProcess.StartInfo.FileName = "cmd";
				serverProcess.StartInfo.RedirectStandardInput = true;
				serverProcess.StartInfo.RedirectStandardOutput = true;
				serverProcess.StartInfo.CreateNoWindow = true;
				serverProcess.StartInfo.UseShellExecute = false;
				serverProcess.Start();
				serverProcess.BeginOutputReadLine();

				string cd = "cd " + Path.Combine(dataFolderPath, "Depot", "server");
				serverProcess.StandardInput.WriteLine(cd);

				serverProcess.StandardInput.WriteLine("npm start");

				serverProcess.StandardInput.Flush();
				serverProcess.StandardInput.Close();

				string newText = "";
				serverProcess.OutputDataReceived += (object sender, DataReceivedEventArgs e) =>
				{
					newText += e.Data + "\r\n";
				};

				DateTime lastserverOutputUpdateTime = DateTime.Now;
				while (true)
				{
					if (newText.Length > 0 && (DateTime.Now - lastserverOutputUpdateTime).TotalMilliseconds > 100)
					{
						if (Application.Current != null)
						{
							Application.Current.Dispatcher.Invoke(System.Windows.Threading.DispatcherPriority.Background,
								new Action(() =>
								{
									ServerOutputText += newText;
									newText = "";
									OnPropertyChanged("ServerOutputText");
								}));
						}
					}
				}
			}));

			serverThread.Start();
		}

		private void LaunchButton_Click(object sender, RoutedEventArgs e)
		{
			KillAllNodeProcesses();

			StartClient();

			if (IsLanMode)
			{
				StartLocalServer();
			}
		}

		private void KillAllNodeProcesses()
		{
			Process[] nodeProcesses = Process.GetProcessesByName("node");
			foreach (Process nodeProcess in nodeProcesses)
			{
				nodeProcess.Kill();
			}
		}

		private void KillAllProcesses()
		{
			KillAllNodeProcesses();

			if (clientProcess != null)
			{
				clientProcess.Close();
				clientThread.Abort();
			}

			if (serverProcess != null)
			{
				serverProcess.Close();
				serverThread.Abort();
			}
		}

		private void Window_Closing(object sender, CancelEventArgs e)
		{
			KillAllNodeProcesses();
		}

		private void InstallNodeButton_Click(object sender, RoutedEventArgs e)
		{
			CheckNodejsAndInstall();
		}

		private void DownloadDepotButton_Click(object sender, RoutedEventArgs e)
		{
			DownloadDepot();
		}

		private string GetLink(string interfaceName, string judgeIndex)
		{
			string url = "";
			if (LocalhostRadio.IsChecked == true)
			{
				url = "http://localhost:8080/index.html";
			}
			else if (LocalServerRadio.IsChecked == true)
			{
				url = "http://" + LanModeSelectedItem + "/index.html";
			}
			else if (InternetProductionRadio.IsChecked == true)
			{
				url = "https://d5rsjgoyn07f8.cloudfront.net/index.html";
			}
			else if (InternetProductionRadio.IsChecked == true)
			{
				url = "https://d27wqtus28jqqk.cloudfront.net/index.html";
			}

			url += "?startup=" + interfaceName + "&tournamentName=" + TournamentName;
			url += judgeIndex.Length > 0 ? "&judgeIndex=" + judgeIndex : "";
			url += IsLanMode ? "&lanMode=true&serverIp=" + LanModeSelectedItem.Replace(".", "_") : "";

			return url;
		}

		private void LinkButton_Click(object sender, RoutedEventArgs e)
		{
			List<string> interfaceNameMap = new List<string>()
			{
				"info",
				"head",
				"scoreboard"
			};

			if (JudgeCountSelectedItem == "6")
			{
				interfaceNameMap.Add("diff");
				interfaceNameMap.Add("diff");
				interfaceNameMap.Add("variety");
				interfaceNameMap.Add("variety");
				interfaceNameMap.Add("exAi");
				interfaceNameMap.Add("exAi");
			}

			Button senderButton = sender as Button;
			int tagNum = int.Parse(senderButton.Tag as string);
			string judgeIndex = tagNum > 2 ? (tagNum - 2).ToString() : "";
			Clipboard.SetText(GetLink(interfaceNameMap[tagNum], judgeIndex));
		}

		private void SetupLinkButtons()
		{
			if (JudgeCountSelectedItem == "6")
			{
				LinkButton0.Visibility = Visibility.Visible;
				LinkButton0.Content = "Diff 1";
				LinkButton1.Visibility = Visibility.Visible;
				LinkButton1.Content = "Diff 2";
				LinkButton2.Visibility = Visibility.Visible;
				LinkButton2.Content = "Variety 1";
				LinkButton3.Visibility = Visibility.Visible;
				LinkButton3.Content = "Variety 2";
				LinkButton4.Visibility = Visibility.Visible;
				LinkButton4.Content = "Ex/Ai 1";
				LinkButton5.Visibility = Visibility.Visible;
				LinkButton5.Content = "Ex/Ai 2";
			}
		}

		private void SetupQrCodes()
		{
			QRCodeWriter qrCode = new QRCodeWriter();
			BarcodeWriter barcodeWriter = new BarcodeWriter
			{
				Format = BarcodeFormat.QR_CODE,
				Options = new ZXing.Common.EncodingOptions
				{
					Height = 500,
					Width = 500,
					Margin = 1
				}
			};

			using (var bitmap = barcodeWriter.Write("test"))
			using (var stream = new MemoryStream())
			{
				bitmap.Save(stream, ImageFormat.Png);

				BitmapImage bi = new BitmapImage();
				bi.BeginInit();
				stream.Seek(0, SeekOrigin.Begin);
				bi.StreamSource = stream;
				bi.CacheOption = BitmapCacheOption.OnLoad;
				bi.EndInit();
				QrCodeImage0 = bi;
			}
		}

		private void JudgeCountComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
		{
			SetupLinkButtons();
			SetupQrCodes();
		}
	}
}
