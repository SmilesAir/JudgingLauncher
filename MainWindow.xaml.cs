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
using System.Windows.Threading;
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

		const string dataFolderPath = "JudgingLauncherData";
		const string nodeInstallerFilename = "node-v12.13.1-x64.msi";
		const string gitInstallerFilename = "Git-2.24.0.2-64-bit.exe";
		const string depotCloneUrl = "https://github.com/SmilesAir/CompleteJudging.git";
		public string InstallNodeButtonString
		{
			get { return installNodeButtonString; }
			set
			{
				installNodeButtonString = value;
				OnPropertyChanged("InstallNodeButtonString");
			}
		}
		string installNodeButtonString = "Checking for Node.js Install";
		public string InstallGitButtonString
		{
			get { return installGitButtonString; }
			set
			{
				installGitButtonString = value;
				OnPropertyChanged("InstallGitButtonString");
			}
		}
		string installGitButtonString = "Checking for Git Install";
		public string DownloadCodeButtonString
		{
			get { return downloadCodeButtonString; }
			set
			{
				downloadCodeButtonString = value;
				OnPropertyChanged("DownloadCodeButtonString");
			}
		}
		string downloadCodeButtonString = "Download Code";
		public string SetupOutputText
		{
			get { return setupOutputText; }
			set
			{
				setupOutputText = value;
				OnPropertyChanged("SetupOutputText");
			}
		}
		string setupOutputText = "";
		public int SelectedTabIndex
		{
			get { return selectedTabIndex; }
			set
			{
				selectedTabIndex = value;
				OnPropertyChanged("SelectedTabIndex");

				Properties.Settings.Default.SelectedTabIndex = value;
				Properties.Settings.Default.Save();
			}
		}
		int selectedTabIndex = 0;
		public ObservableCollection<string> StageOptions
		{
			get { return stageOptions; }
			set
			{
				stageOptions = value;
				OnPropertyChanged("StageOptions");
			}
		}
		ObservableCollection<string> stageOptions = new ObservableCollection<string>() { "Development", "Production" };
		public string StageSelectedItem
		{
			get { return stageSelectedItem; }
			set
			{
				stageSelectedItem = value;
				OnPropertyChanged("StageSelectedItem");

				Properties.Settings.Default.StageSelectedItem = value;
				Properties.Settings.Default.Save();

				SetupLinks();
			}
		}
		string stageSelectedItem = "";
		public bool IsProduction { get { return StageSelectedItem == "Production"; } }
		public ObservableCollection<string> ServerOptions
		{
			get { return serverOptions; }
			set
			{
				serverOptions = value;
				OnPropertyChanged("ServerOptions");
			}
		}
		ObservableCollection<string> serverOptions = new ObservableCollection<string>() { "Localhost", "Local Server", "Internet" };
		public string ServerSelectedItem
		{
			get { return serverSelectedItem; }
			set
			{
				serverSelectedItem = value;
				OnPropertyChanged("ServerSelectedItem");

				Properties.Settings.Default.ServerSelectedItem = value;
				Properties.Settings.Default.Save();

				SetupLinks();
			}
		}
		string serverSelectedItem = "";
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

				SetupLinks();
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

				SetupLinks();
			}
		}
		string judgeCountSelectedItem = "";
		List<JudgeLinkObjects> judgeLinkObjects = new List<JudgeLinkObjects>();


		public string TournamentName
		{
			get { return tournamentName; }
			set
			{
				tournamentName = value;

				OnPropertyChanged("TournamentName");

				Properties.Settings.Default.TournamentName = tournamentName;
				Properties.Settings.Default.Save();

				SetupLinks();
			}
		}
		string tournamentName = "";

		Process clientProcess;
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

				OnPropertyChanged("ClientOutputText");

				ClientOutputTextbox.ScrollToEnd();
			}
		}
		string clientOutputText = "";
		DispatcherTimer clientLogTimer = new DispatcherTimer();
		DispatcherTimer clientLoadingTimer = new DispatcherTimer();

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

				OnPropertyChanged("ServerOutputText");

				ServerOutputTextbox.ScrollToEnd();
			}
		}
		string serverOutputText = "";
		Process serverProcess;
		DispatcherTimer serverLogTimer = new DispatcherTimer();
		DispatcherTimer serverLoadingTimer = new DispatcherTimer();

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
			string bestStartingIp = null;
			foreach (var ip in host.AddressList)
			{
				if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
				{
					string ipString = ip.ToString();
					LanModeOptions.Add(ipString);

					if (ipString.StartsWith("192"))
					{
						bestStartingIp = ipString;
					}
					else if (bestStartingIp == null && ipString != "Disabled")
					{
						bestStartingIp = ipString;
					}
				}
			}

			if (Properties.Settings.Default.IsFirstStartup)
			{
				Properties.Settings.Default.IsFirstStartup = false;

				Properties.Settings.Default.LanModeSelectedItem = bestStartingIp;
			}

			StageSelectedItem = Properties.Settings.Default.StageSelectedItem;
			ServerSelectedItem = Properties.Settings.Default.ServerSelectedItem;
			LanModeSelectedItem = Properties.Settings.Default.LanModeSelectedItem;
			JudgeCountSelectedItem = Properties.Settings.Default.JudgeCountSelectedItem;
			SelectedTabIndex = Properties.Settings.Default.SelectedTabIndex;

			judgeLinkObjects.Add(new JudgeLinkObjects(LinkButton0, QrCodeImage0, QrCodeLabel0));
			judgeLinkObjects.Add(new JudgeLinkObjects(LinkButton1, QrCodeImage1, QrCodeLabel1));
			judgeLinkObjects.Add(new JudgeLinkObjects(LinkButton2, QrCodeImage2, QrCodeLabel2));
			judgeLinkObjects.Add(new JudgeLinkObjects(LinkButton3, QrCodeImage3, QrCodeLabel3));
			judgeLinkObjects.Add(new JudgeLinkObjects(LinkButton4, QrCodeImage4, QrCodeLabel4));
			judgeLinkObjects.Add(new JudgeLinkObjects(LinkButton5, QrCodeImage5, QrCodeLabel5));
			judgeLinkObjects.Add(new JudgeLinkObjects(LinkButton6, QrCodeImage6, QrCodeLabel6));
			judgeLinkObjects.Add(new JudgeLinkObjects(LinkButton7, QrCodeImage7, QrCodeLabel7));
			judgeLinkObjects.Add(new JudgeLinkObjects(LinkButton8, QrCodeImage8, QrCodeLabel8));

			SetupLinks();

			new Thread(() => {
				bool isNodeInstalled = CheckNodeInstalled();
				bool isGitInstalled = CheckGitInstalled();

				Application.Current.Dispatcher.Invoke(System.Windows.Threading.DispatcherPriority.Background,
						new Action(() =>
						{
							InstallNodeButtonString = isNodeInstalled ? "Reinstall Node.js" : "Click to install Node.js";
							InstallGitButtonString = isGitInstalled ? "Reinstall Git" : "Click to install Git";

							SetupOutputText += isNodeInstalled ? "Node.js is Installed\r\n" : "Missing Node.js. Please Install\r\n";
							SetupOutputText += isNodeInstalled ? "Git is Installed\r\n" : "Missing Git. Please Install\r\n";

							UpdateDepotGitStatus();
						}));
			}).Start();
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

		private void UpdateDepotGitStatus()
		{
			if (!CheckGitInstalled())
			{
				return;
			}

			string completeJudgingDepot = Path.Combine(dataFolderPath, "Depot");
			if (!Directory.Exists(completeJudgingDepot))
			{
				SetupOutputText += "Missing Code. Need to download code\r\n";
			}
			else
			{
				{
					Process gitProcess = new Process();
					gitProcess.StartInfo.FileName = "git";
					gitProcess.StartInfo.WorkingDirectory = completeJudgingDepot;
					gitProcess.StartInfo.Arguments = "fetch";
					gitProcess.StartInfo.CreateNoWindow = true;
					gitProcess.StartInfo.UseShellExecute = false;
					gitProcess.Start();

					gitProcess.WaitForExit();
				}
				{
					Process gitProcess = new Process();
					gitProcess.StartInfo.FileName = "git";
					gitProcess.StartInfo.WorkingDirectory = completeJudgingDepot;
					gitProcess.StartInfo.Arguments = "status";
					gitProcess.StartInfo.RedirectStandardOutput = true;
					gitProcess.StartInfo.CreateNoWindow = true;
					gitProcess.StartInfo.UseShellExecute = false;
					gitProcess.Start();

					gitProcess.WaitForExit();
					string output = gitProcess.StandardOutput.ReadToEnd();
					if (output.Contains("Your branch is up to date"))
					{
						SetupOutputText += "You have the lastest code version\r\n";
						DownloadCodeButtonString = "Download Code";
					}
					else
					{
						SetupOutputText += "Code is out of update. Click Download Code to update\r\n";
						DownloadCodeButtonString = "Download Code\r\n(New Code Available)";
					}
				}
			}
		}

		private void DownloadDepot()
		{
			if (!CheckGitInstalled())
			{
				SetupOutputText += "Need to install Git before code can be downloaded\r\n";
				return;
			}

			string completeJudgingDepot = Path.Combine(dataFolderPath, "Depot");
			if (!Directory.Exists(completeJudgingDepot))
			{
				string gitCommand = "clone " + depotCloneUrl + " Depot";
				Process gitProcess = new Process();
				gitProcess.StartInfo.FileName = "git";
				gitProcess.StartInfo.WorkingDirectory = dataFolderPath;
				gitProcess.StartInfo.Arguments = gitCommand;
				gitProcess.StartInfo.RedirectStandardOutput = true;
				gitProcess.StartInfo.CreateNoWindow = true;
				gitProcess.StartInfo.UseShellExecute = false;
				gitProcess.Start();

				gitProcess.WaitForExit();

				SetupOutputText += "Code successfully downloaded\r\n";
			}
			else
			{
				string gitCommand = "pull";
				Process gitProcess = new Process();
				gitProcess.StartInfo.FileName = "git";
				gitProcess.StartInfo.WorkingDirectory = completeJudgingDepot;
				gitProcess.StartInfo.Arguments = gitCommand;
				gitProcess.StartInfo.RedirectStandardOutput = true;
				gitProcess.StartInfo.CreateNoWindow = true;
				gitProcess.StartInfo.UseShellExecute = false;
				gitProcess.Start();

				gitProcess.WaitForExit();
				SetupOutputText += gitProcess.StandardOutput.ReadToEnd();

				SetupOutputText += "Code successfully updated\r\n";
				DownloadCodeButtonString = "Download Code";
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

		private bool CheckNodeInstalled()
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
			return output.Contains("Usage: npm <command>");
		}

		private void CheckNodeAndInstall()
		{
			if (MessageBox.Show("Click OK to install Node.js", "Attention", MessageBoxButton.OKCancel) == MessageBoxResult.OK)
			{
				Process.Start(nodeInstallerFilename).WaitForExit();

				Restart();
			}
		}

		private bool CheckGitInstalled()
		{
			Process cmd = new Process();
			cmd.StartInfo.FileName = "cmd.exe";
			cmd.StartInfo.RedirectStandardInput = true;
			cmd.StartInfo.RedirectStandardOutput = true;
			cmd.StartInfo.CreateNoWindow = true;
			cmd.StartInfo.UseShellExecute = false;
			cmd.Start();

			cmd.StandardInput.WriteLine("git");
			cmd.StandardInput.Flush();
			cmd.StandardInput.Close();

			cmd.WaitForExit();

			string output = cmd.StandardOutput.ReadToEnd();
			return output.Contains("usage: git");
		}

		private void CheckGitAndInstall()
		{
			if (MessageBox.Show("Click OK to install Git", "Attention", MessageBoxButton.OKCancel) == MessageBoxResult.OK)
			{
				Process.Start(gitInstallerFilename).WaitForExit();

				Restart();
			}
		}

		private void Restart()
		{
			System.Diagnostics.Process.Start(Application.ResourceAssembly.Location);
			Application.Current.Shutdown();
		}

		private void StartClient()
		{
			clientProcess = new Process();
			clientProcess.StartInfo.FileName = "cmd";
			clientProcess.StartInfo.RedirectStandardInput = true;
			clientProcess.StartInfo.RedirectStandardOutput = true;
			clientProcess.StartInfo.CreateNoWindow = true;
			clientProcess.StartInfo.UseShellExecute = false;
			clientProcess.EnableRaisingEvents = true;
			clientProcess.Exited += (object sender, EventArgs e) =>
			{
				clientLoadingTimer.Stop();

				if (Application.Current != null)
				{
					Application.Current.Dispatcher.Invoke(System.Windows.Threading.DispatcherPriority.Background,
						new Action(() =>
						{
							ClientOutputText += "\r\n\r\n";
							ClientOutputText += "---------------------------------------------------------------------------------\r\n";
							ClientOutputText += "Process exited!\r\n";
							ClientOutputText += "This should only happen on relaunch or re download.\r\n";
							ClientOutputText += "There may be an issue with your install setup.\r\n";
							ClientOutputText += "---------------------------------------------------------------------------------\r\n";
							ClientOutputText += "\r\n\r\n";
						}));
				}
			};
			clientProcess.Start();
			clientProcess.BeginOutputReadLine();

			string cd = "cd " + Path.Combine(dataFolderPath, "Depot", "client");
			clientProcess.StandardInput.WriteLine(cd);

			clientProcess.StandardInput.WriteLine(IsProduction ? "npm run start:production" : "npm start");

			clientProcess.StandardInput.Flush();
			clientProcess.StandardInput.Close();

			string newText = "";
			clientProcess.OutputDataReceived += (object sender, DataReceivedEventArgs e) =>
			{
				newText += e.Data + "\r\n";
			};

			clientLogTimer.Interval = new TimeSpan(0, 0, 0, 0, 100);
			clientLogTimer.Tick += (object sender, EventArgs e) =>
			{
				if (Application.Current != null && newText.Length > 0)
				{
					Application.Current.Dispatcher.Invoke(System.Windows.Threading.DispatcherPriority.Background,
						new Action(() =>
						{
							if (newText.Contains("Startup Finished. Ready to go!"))
							{
								clientLoadingTimer.Stop();
							}

							ClientOutputText += newText;
							newText = "";
						}));
				}
			};
			clientLogTimer.Start();

			clientLoadingTimer.Interval = new TimeSpan(0, 0, 1);
			clientLoadingTimer.Tick += (object sender, EventArgs e) =>
			{
				Application.Current.Dispatcher.Invoke(System.Windows.Threading.DispatcherPriority.Background,
					new Action(() =>
					{
						ClientOutputText += "Loading Client ...\r\n";
					}));
			};
			clientLoadingTimer.Start();
		}

		private void StartLocalServer()
		{
			serverProcess = new Process();
			serverProcess.StartInfo.FileName = "cmd";
			serverProcess.StartInfo.RedirectStandardInput = true;
			serverProcess.StartInfo.RedirectStandardOutput = true;
			serverProcess.StartInfo.CreateNoWindow = true;
			serverProcess.StartInfo.UseShellExecute = false;
			serverProcess.EnableRaisingEvents = true;
			serverProcess.Exited += (object sender, EventArgs e) =>
			{
				serverLoadingTimer.Stop();

				if (Application.Current != null)
				{
					Application.Current.Dispatcher.Invoke(System.Windows.Threading.DispatcherPriority.Background,
						new Action(() =>
						{
							ServerOutputText += "\r\n\r\n";
							ServerOutputText += "---------------------------------------------------------------------------------\r\n";
							ServerOutputText += "Process exited!\r\n";
							ServerOutputText += "This should only happen on relaunch or re download.\r\n";
							ServerOutputText += "There may be an issue with your install setup.\r\n";
							ServerOutputText += "---------------------------------------------------------------------------------\r\n";
							ServerOutputText += "\r\n\r\n";
						}));
				}
			};
			serverProcess.Start();
			serverProcess.BeginOutputReadLine();

			string cd = "cd " + Path.Combine(dataFolderPath, "Depot", "server");
			serverProcess.StandardInput.WriteLine(cd);

			serverProcess.StandardInput.WriteLine(IsProduction ? "npm run start:production" : "npm start");

			serverProcess.StandardInput.Flush();
			serverProcess.StandardInput.Close();

			string newText = "";
			serverProcess.OutputDataReceived += (object sender, DataReceivedEventArgs e) =>
			{
				newText += e.Data + "\r\n";
			};


			serverLogTimer.Interval = new TimeSpan(0, 0, 0, 0, 100);
			serverLogTimer.Tick += (object sender, EventArgs e) =>
			{
				if (Application.Current != null && newText.Length > 0)
				{
					Application.Current.Dispatcher.Invoke(System.Windows.Threading.DispatcherPriority.Background,
						new Action(() =>
						{
							if (newText.Contains("Startup Finished. Ready to go!"))
							{
								serverLoadingTimer.Stop();
							}

							ServerOutputText += newText;
							newText = "";
						}));
				}
			};
			serverLogTimer.Start();

			serverLoadingTimer.Interval = new TimeSpan(0, 0, 1);
			serverLoadingTimer.Tick += (object sender, EventArgs e) =>
			{
				Application.Current.Dispatcher.Invoke(System.Windows.Threading.DispatcherPriority.Background,
					new Action(() =>
					{
						ServerOutputText += "Loading Server ...\r\n";
					}));
			};
			serverLoadingTimer.Start();
		}

		private void Launch()
		{
			KillAllProcesses();

			StartClient();

			if (IsLanMode)
			{
				StartLocalServer();
			}
		}

		private void LaunchButton_Click(object sender, RoutedEventArgs e)
		{
			Launch();
		}

		private void KillAllNodeProcesses()
		{
			Process[] nodeProcesses = Process.GetProcessesByName("node");
			foreach (Process nodeProcess in nodeProcesses)
			{
				if (!nodeProcess.HasExited)
				{
					nodeProcess.Kill();
				}
			}
		}

		private void KillAllProcesses()
		{
			KillAllNodeProcesses();

			if (clientProcess != null)
			{
				clientProcess.Close();
			}

			if (serverProcess != null)
			{
				serverProcess.Close();
			}
		}

		private void Window_Closing(object sender, CancelEventArgs e)
		{
			KillAllProcesses();
		}

		private void InstallNodeButton_Click(object sender, RoutedEventArgs e)
		{
			CheckNodeAndInstall();
		}
		private void InstallGitButton_Click(object sender, RoutedEventArgs e)
		{
			CheckGitAndInstall();
		}

		private void DownloadDepotButton_Click(object sender, RoutedEventArgs e)
		{
			DownloadDepot();
		}

		private string GetLink(string interfaceName, string judgeIndex)
		{
			string url = "";
			if (ServerSelectedItem == "Localhost")
			{
				url = "http://localhost:8080/index.html";
			}
			else if (ServerSelectedItem == "Local Server")
			{
				url = "http://" + LanModeSelectedItem + ":8080/index.html";
			}
			else if (ServerSelectedItem == "Internet")
			{
				if (IsProduction)
				{
					url = "https://d5rsjgoyn07f8.cloudfront.net/index.html";
				}
				else
				{
					url = "https://d27wqtus28jqqk.cloudfront.net/index.html";
				}
			}

			url += "?startup=" + interfaceName + "&tournamentName=" + TournamentName;
			url += judgeIndex.Length > 0 ? "&judgeIndex=" + judgeIndex : "";
			url += IsLanMode ? "&lanMode=true&serverIp=" + LanModeSelectedItem.Replace(".", "_") : "";

			return url;
		}

		private void LinkButton_Click(object sender, RoutedEventArgs e)
		{
			Button senderButton = sender as Button;
			Clipboard.SetText(senderButton.Tag as string);
		}

		private void SetupLinks()
		{
			int judgeCount;
			if (!int.TryParse(JudgeCountSelectedItem, out judgeCount))
			{
				return;
			}

			if (judgeCount > judgeLinkObjects.Count)
			{
				return;
			}

			foreach (JudgeLinkObjects obj in judgeLinkObjects)
			{
				obj.linkButton.Visibility = Visibility.Collapsed;
				obj.qrCodeImage.Visibility = Visibility.Collapsed;
				obj.qrCodeLabel.Visibility = Visibility.Collapsed;
			}

			List<string> interfaceNameMap = new List<string>();

			if (judgeCount == 3)
			{
				interfaceNameMap.Add("exAi");
				interfaceNameMap.Add("variety");
				interfaceNameMap.Add("diff");

				judgeLinkObjects[0].qrCodeLabel.Content = LinkButton0.Content = "Ex/Ai 1";
				judgeLinkObjects[1].qrCodeLabel.Content = LinkButton2.Content = "Variety 1";
				judgeLinkObjects[2].qrCodeLabel.Content = LinkButton4.Content = "Diff 1";
			}
			else if (judgeCount == 6)
			{
				interfaceNameMap.Add("exAi");
				interfaceNameMap.Add("exAi");
				interfaceNameMap.Add("variety");
				interfaceNameMap.Add("variety");
				interfaceNameMap.Add("diff");
				interfaceNameMap.Add("diff");

				judgeLinkObjects[0].qrCodeLabel.Content = LinkButton0.Content = "Ex/Ai 1";
				judgeLinkObjects[1].qrCodeLabel.Content = LinkButton1.Content = "Ex/Ai 2";
				judgeLinkObjects[2].qrCodeLabel.Content = LinkButton2.Content = "Variety 1";
				judgeLinkObjects[3].qrCodeLabel.Content = LinkButton3.Content = "Variety 2";
				judgeLinkObjects[4].qrCodeLabel.Content = LinkButton4.Content = "Diff 1";
				judgeLinkObjects[5].qrCodeLabel.Content = LinkButton5.Content = "Diff 2";
			}
			else if (judgeCount == 9)
			{
				interfaceNameMap.Add("exAi");
				interfaceNameMap.Add("exAi");
				interfaceNameMap.Add("exAi");
				interfaceNameMap.Add("variety");
				interfaceNameMap.Add("variety");
				interfaceNameMap.Add("variety");
				interfaceNameMap.Add("diff");
				interfaceNameMap.Add("diff");
				interfaceNameMap.Add("diff");

				judgeLinkObjects[0].qrCodeLabel.Content = LinkButton0.Content = "Ex/Ai 1";
				judgeLinkObjects[1].qrCodeLabel.Content = LinkButton1.Content = "Ex/Ai 2";
				judgeLinkObjects[2].qrCodeLabel.Content = LinkButton2.Content = "Ex/Ai 3";
				judgeLinkObjects[3].qrCodeLabel.Content = LinkButton3.Content = "Variety 1";
				judgeLinkObjects[4].qrCodeLabel.Content = LinkButton4.Content = "Variety 2";
				judgeLinkObjects[5].qrCodeLabel.Content = LinkButton5.Content = "Variety 3";
				judgeLinkObjects[6].qrCodeLabel.Content = LinkButton6.Content = "Diff 1";
				judgeLinkObjects[7].qrCodeLabel.Content = LinkButton7.Content = "Diff 2";
				judgeLinkObjects[8].qrCodeLabel.Content = LinkButton8.Content = "Diff 3";
			}

			LinkButtonInfo.Tag = GetLink("info", "");
			LinkButtonHead.Tag = GetLink("head", "");
			LinkButtonScoreboard.Tag = GetLink("scoreboard", "");

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

			for (int i = 0; i < judgeCount; ++i)
			{
				string link = GetLink(interfaceNameMap[i], i.ToString());
				judgeLinkObjects[i].linkButton.Tag = link;
				judgeLinkObjects[i].linkButton.Visibility = Visibility.Visible;
				judgeLinkObjects[i].qrCodeImage.Visibility = Visibility.Visible;
				judgeLinkObjects[i].qrCodeLabel.Visibility = Visibility.Visible;

				using (var bitmap = barcodeWriter.Write(link))
				using (var stream = new MemoryStream())
				{
					bitmap.Save(stream, ImageFormat.Png);

					BitmapImage bi = new BitmapImage();
					bi.BeginInit();
					stream.Seek(0, SeekOrigin.Begin);
					bi.StreamSource = stream;
					bi.CacheOption = BitmapCacheOption.OnLoad;
					bi.EndInit();
					judgeLinkObjects[i].qrCodeImage.Source = bi;
				}
			}
		}

		private void BackupAndResetServerButton_Click(object sender, RoutedEventArgs e)
		{
			string serverDataPath = Path.Combine(dataFolderPath, "Depot", "server", "serverData");
			if (Directory.Exists(serverDataPath))
			{
				new Thread(() =>
				{
					bool isRunning = Process.GetProcessesByName("node").Count() > 0;
					if (isRunning)
					{
						KillAllProcesses();
					}

					// Wait for node processes to die
					System.Threading.Thread.Sleep(2000);

					Directory.Move(serverDataPath, serverDataPath + " " + DateTime.Now.ToString("yyyy-dd-M--HH-mm-ss"));

					if (isRunning)
					{
						Launch();
					}
				}).Start();
			}
		}

		private void PrintQrCodesButton_Click(object sender, RoutedEventArgs e)
		{
			PrintDialog dlg = new PrintDialog();
			dlg.PrintTicket.PageOrientation = System.Printing.PageOrientation.Portrait;
			dlg.ShowDialog();
			dlg.PrintVisual(QrCodesGrid, "Printing");
		}
	}

	public class JudgeLinkObjects
	{
		public Button linkButton = null;
		public Image qrCodeImage = null;
		public Label qrCodeLabel = null;

		public JudgeLinkObjects()
		{
		}

		public JudgeLinkObjects(Button button, Image image, Label label)
		{
			linkButton = button;
			qrCodeImage = image;
			qrCodeLabel = label;
		}
	};
}
